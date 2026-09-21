import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EffectScope } from 'vue'
import type { AnalysisResult, AnalysisStatusResponse } from '~/types'

const ID = '123e4567-e89b-12d3-a456-426614174000'
const fileUpload = { status: 'OK', source: 1, usernames: 'magnus' } as const
const game = { count: 1, opponents_avg_rating: {}, openings: [] } as const
const roast = { roast: 'r', encouragement: 'e', tip: 't' }

const respond = (result: AnalysisResult): AnalysisStatusResponse => ({ result })

const scopes: EffectScope[] = []

function setup(
  fetchStatus: (id: string) => Promise<AnalysisStatusResponse>,
  options: Parameters<typeof useAnalysisStatus>[1] = {},
  id: Parameters<typeof useAnalysisStatus>[0] = ID,
) {
  const scope = effectScope()
  scopes.push(scope)
  const api = scope.run(() =>
    useAnalysisStatus(id, {
      intervalMs: 3_000,
      graceMs: 10_000,
      maxMs: 10_000,
      ...options,
      fetchStatus,
    }),
  )!
  return { ...api, scope }
}

/** Returns each queued response once, then repeats the last one. */
function sequence(...responses: (AnalysisStatusResponse | Error)[]) {
  let i = 0
  return vi.fn(async () => {
    const next = responses[Math.min(i++, responses.length - 1)]!
    if (next instanceof Error) throw next
    return next
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop())
  vi.useRealTimers()
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
})

describe('useAnalysisStatus', () => {
  it('fetches immediately, with the tracking id', async () => {
    const fetchStatus = sequence(respond({}))
    const { state, result } = setup(fetchStatus, { roast: false })

    expect(state.value).toBe('polling')
    await vi.advanceTimersByTimeAsync(0)

    expect(fetchStatus).toHaveBeenCalledTimes(1)
    expect(fetchStatus).toHaveBeenCalledWith(ID)
    // `{}` is a real "nothing finished yet" response, not the same as "no response yet".
    expect(result.value).toEqual({})
  })

  it('is null until the first response arrives', () => {
    const { result } = setup(sequence(respond({})), { roast: false })
    expect(result.value).toBeNull()
  })

  it('keeps polling until the game stage appears, then stops (no roast)', async () => {
    const fetchStatus = sequence(
      respond({}),
      respond({ file_upload: fileUpload }),
      respond({ file_upload: fileUpload, game }),
    )
    const { state, progress } = setup(fetchStatus, { roast: false })

    await vi.advanceTimersByTimeAsync(0)
    expect(state.value).toBe('polling')
    expect(progress.value).toBe(0)

    await vi.advanceTimersByTimeAsync(3_000)
    expect(progress.value).toBe(50)

    await vi.advanceTimersByTimeAsync(3_000)
    expect(state.value).toBe('done')
    expect(progress.value).toBe(100)

    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchStatus).toHaveBeenCalledTimes(3)
  })

  it('waits for the roast when one was requested', async () => {
    const fetchStatus = sequence(
      respond({ file_upload: fileUpload, game }),
      respond({ file_upload: fileUpload, game, roasting_user: roast }),
    )
    const { state, progress } = setup(fetchStatus, { roast: true })

    await vi.advanceTimersByTimeAsync(0)
    expect(state.value).toBe('polling')
    expect(progress.value).toBe(67)

    await vi.advanceTimersByTimeAsync(3_000)
    expect(state.value).toBe('done')
    expect(progress.value).toBe(100)
  })

  it('gives an unknown roast flag a grace window after the game stage, then stops', async () => {
    const fetchStatus = sequence(respond({ file_upload: fileUpload, game }))
    const { state } = setup(fetchStatus, { roast: undefined, maxMs: 60_000 })

    await vi.advanceTimersByTimeAsync(0) // game seen at t=0
    await vi.advanceTimersByTimeAsync(9_000) // t=9s, still inside the 10s grace window
    expect(state.value).toBe('polling')

    await vi.advanceTimersByTimeAsync(3_000) // t=12s, grace over
    expect(state.value).toBe('done')
  })

  it('stops early if the roast shows up during the grace window', async () => {
    const fetchStatus = sequence(
      respond({ file_upload: fileUpload, game }),
      respond({ file_upload: fileUpload, game, roasting_user: roast }),
    )
    const { state } = setup(fetchStatus, { roast: undefined })

    await vi.advanceTimersByTimeAsync(0)
    expect(state.value).toBe('polling')
    await vi.advanceTimersByTimeAsync(3_000)
    expect(state.value).toBe('done')
  })

  it('stops with a timeout instead of polling forever', async () => {
    const fetchStatus = sequence(respond({}))
    const { state } = setup(fetchStatus, { roast: false })

    await vi.advanceTimersByTimeAsync(12_000)
    expect(state.value).toBe('timeout')

    const calls = fetchStatus.mock.calls.length
    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchStatus).toHaveBeenCalledTimes(calls)
  })

  it('stops on an error and surfaces the backend message', async () => {
    const fetchStatus = sequence(
      Object.assign(new Error('bad'), {
        data: { detail: 'Please check the Tracking ID you have provided.' },
        status: 400,
      }),
    )
    const { state, error } = setup(fetchStatus, { roast: false })

    await vi.advanceTimersByTimeAsync(0)
    expect(state.value).toBe('error')
    expect(error.value).toBe('Please check the Tracking ID you have provided.')

    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchStatus).toHaveBeenCalledTimes(1)
  })

  it('retry() starts over and clears the error', async () => {
    const fetchStatus = sequence(
      Object.assign(new Error('down'), { status: 503 }),
      respond({ file_upload: fileUpload, game }),
    )
    const { state, error, result, retry } = setup(fetchStatus, { roast: false })

    await vi.advanceTimersByTimeAsync(0)
    expect(state.value).toBe('error')

    retry()
    expect(error.value).toBeNull()
    expect(result.value).toBeNull()
    await vi.advanceTimersByTimeAsync(0)
    expect(state.value).toBe('done')
  })

  it('restarts when the tracking id changes and ignores the older response', async () => {
    const id = ref('first')
    let resolveFirst!: (value: AnalysisStatusResponse) => void
    const fetchStatus = vi
      .fn<(id: string) => Promise<AnalysisStatusResponse>>()
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValue(respond({ file_upload: fileUpload, game }))
    const { result, state } = setup(fetchStatus, { roast: false }, id)

    id.value = 'second'
    await nextTick()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchStatus).toHaveBeenLastCalledWith('second')
    expect(state.value).toBe('done')

    // The first request answers late; it must not overwrite the newer result.
    resolveFirst(respond({}))
    await vi.advanceTimersByTimeAsync(0)
    expect(result.value).toEqual({ file_upload: fileUpload, game })
  })

  it('stops polling when its scope is disposed', async () => {
    const fetchStatus = sequence(respond({}))
    const { scope } = setup(fetchStatus, { roast: false, maxMs: 60_000 })

    await vi.advanceTimersByTimeAsync(0)
    scope.stop()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchStatus).toHaveBeenCalledTimes(1)
  })

  it('does not fetch while the tab is hidden, and resumes when it is visible again', async () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    const fetchStatus = sequence(respond({}))
    setup(fetchStatus, { roast: false, maxMs: 60_000 })

    await vi.advanceTimersByTimeAsync(9_000)
    expect(fetchStatus).not.toHaveBeenCalled()

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(3_000)
    expect(fetchStatus).toHaveBeenCalled()
  })
})
