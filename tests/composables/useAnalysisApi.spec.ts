import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
const api = () => useAnalysisApi(fetchMock as unknown as typeof $fetch)

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ status_id: 'abc' })
})

describe('useAnalysisApi.startPgnUpload', () => {
  it('posts multipart form data to /server/pgn/upload', async () => {
    const file = new File(['1. e4 e5'], 'games.pgn', { type: 'application/x-chess-pgn' })

    const response = await api().startPgnUpload({
      file,
      usernames: '  magnus  ',
      includeRoast: true,
    })

    expect(response).toEqual({ status_id: 'abc' })
    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe('/server/pgn/upload')
    expect(options.method).toBe('POST')
    const body = options.body as FormData
    expect(body).toBeInstanceOf(FormData)
    expect((body.get('pgn_file') as File).name).toBe('games.pgn')
    expect(body.get('usernames')).toBe('magnus')
    // The backend reads a form field, so the boolean travels as a string.
    expect(body.get('include_roast')).toBe('true')
  })

  it('sends include_roast=false when the roast is off', async () => {
    await api().startPgnUpload({
      file: new File([''], 'g.pgn'),
      usernames: 'a',
      includeRoast: false,
    })
    expect((fetchMock.mock.calls[0]![1].body as FormData).get('include_roast')).toBe('false')
  })
})

describe('useAnalysisApi.startExternalUser', () => {
  it('posts JSON to the route WITH its trailing slash', async () => {
    await api().startExternalUser({
      username: ' hikaru ',
      platform: 'lichess',
      includeRoast: false,
    })

    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe('/server/pgn/external_user/')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({ username: 'hikaru', platform: 'lichess', include_roast: false })
  })
})

describe('useAnalysisApi.fetchStatus', () => {
  it('gets the status route for the tracking id', async () => {
    fetchMock.mockResolvedValue({ result: {} })
    const id = '123e4567-e89b-12d3-a456-426614174000'

    await expect(api().fetchStatus(id)).resolves.toEqual({ result: {} })
    expect(fetchMock).toHaveBeenCalledWith(`/server/analysis/status/${id}`)
  })

  it('url-encodes the id so it cannot change the path', async () => {
    await api().fetchStatus('a/b?c')
    expect(fetchMock.mock.calls[0]![0]).toBe('/server/analysis/status/a%2Fb%3Fc')
  })
})
