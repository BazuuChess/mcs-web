import type { MaybeRefOrGetter } from 'vue'
import type { AnalysisResult, AnalysisStatusResponse, PollState } from '~/types'

export const POLL_INTERVAL_MS = 3_000
/** With an unknown roast flag, keep polling this long after `game` appears in case a roast follows. */
export const ROAST_GRACE_MS = 60_000
export const MAX_POLL_MS = 10 * 60_000

export interface UseAnalysisStatusOptions {
  /** `true`/`false` when known (we just submitted the form), `undefined` when opened by ID. */
  roast?: MaybeRefOrGetter<boolean | undefined>
  fetchStatus?: (statusId: string) => Promise<AnalysisStatusResponse>
  intervalMs?: number
  graceMs?: number
  maxMs?: number
}

/**
 * Polls the status endpoint until the analysis is complete, fails, or times out.
 * The backend exposes no "failed" state and no roast flag, so completion is inferred from which
 * stage keys are present (see docs/api.md).
 */
export function useAnalysisStatus(
  statusId: MaybeRefOrGetter<string>,
  options: UseAnalysisStatusOptions = {},
) {
  const {
    fetchStatus = useAnalysisApi().fetchStatus,
    intervalMs = POLL_INTERVAL_MS,
    graceMs = ROAST_GRACE_MS,
    maxMs = MAX_POLL_MS,
  } = options

  const result = ref<AnalysisResult | null>(null)
  const error = ref<string | null>(null)
  const state = ref<PollState>('idle')

  const roast = computed(() => toValue(options.roast))
  const progress = computed(() => progressPercent(result.value ?? {}, roast.value))
  const visibility = useDocumentVisibility()

  let timer: ReturnType<typeof setTimeout> | undefined
  let startedAt = 0
  let gameSeenAt: number | null = null
  // Bumped on every start/stop so a response from an older run can't overwrite a newer one.
  let run = 0

  function clearTimer() {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }

  function isFinished(now: number): boolean {
    const current = result.value ?? {}
    if (!isAnalysisComplete(current, roast.value)) return false
    if (roast.value !== undefined || hasStage(current, 'roasting_user')) return true
    return gameSeenAt !== null && now - gameSeenAt >= graceMs
  }

  function schedule(thisRun: number) {
    timer = setTimeout(() => void tick(thisRun), intervalMs)
  }

  async function tick(thisRun: number) {
    if (thisRun !== run) return

    if (Date.now() - startedAt > maxMs) {
      state.value = 'timeout'
      return
    }
    if (visibility.value === 'hidden') {
      schedule(thisRun)
      return
    }

    try {
      const response = await fetchStatus(toValue(statusId))
      if (thisRun !== run) return
      result.value = response.result ?? {}
      error.value = null
      if (gameSeenAt === null && hasStage(result.value, 'game')) gameSeenAt = Date.now()
      if (isFinished(Date.now())) {
        state.value = 'done'
        return
      }
    } catch (err) {
      if (thisRun !== run) return
      error.value = parseApiError(err)
      state.value = 'error'
      return
    }
    schedule(thisRun)
  }

  function start() {
    stop()
    run += 1
    startedAt = Date.now()
    gameSeenAt = null
    result.value = null
    error.value = null
    state.value = 'polling'
    void tick(run)
  }

  function stop() {
    run += 1
    clearTimer()
  }

  function retry() {
    start()
  }

  watch(() => toValue(statusId), start, { immediate: true })
  if (getCurrentScope()) onScopeDispose(stop)

  return { result, error, state, progress, roast, retry, stop }
}
