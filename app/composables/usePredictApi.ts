import type { PredictApi } from '~/types'

/**
 * The backend has no "predict next move" endpoint yet, so this is a mock (see docs/api.md).
 * When the endpoint exists, replace the body of `predictNextMove` with a `$fetch` call and keep
 * the `PredictApi` interface; nothing else has to change.
 */
export function usePredictApi(options: { delayMs?: number } = {}): PredictApi {
  const { delayMs = 600 } = options

  return {
    async predictNextMove(fen) {
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
      return pickMockMove(fen)
    },
  }
}
