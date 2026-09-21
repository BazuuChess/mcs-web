import type { AnalysisStatusResponse, Platform, StartAnalysisResponse } from '~/types'

const API_BASE = '/server'

export interface PgnUploadInput {
  file: File
  /** One username, or several separated by `||`. */
  usernames: string
  includeRoast: boolean
}

export interface ExternalUserInput {
  username: string
  platform: Platform
  includeRoast: boolean
}

/**
 * Thin wrapper over the API. `/server/*` is proxied to `<API>/api/v1/*` (nuxt.config.ts).
 * Errors are thrown as ofetch errors; turn them into text with `parseApiError`.
 * `fetcher` exists so tests can inject a fake; production code uses the default `$fetch`.
 */
export function useAnalysisApi(fetcher: typeof $fetch = $fetch) {
  return {
    startPgnUpload({ file, usernames, includeRoast }: PgnUploadInput) {
      const body = new FormData()
      body.append('pgn_file', file)
      body.append('usernames', usernames.trim())
      body.append('include_roast', String(includeRoast))
      return fetcher<StartAnalysisResponse>(`${API_BASE}/pgn/upload`, { method: 'POST', body })
    },

    startExternalUser({ username, platform, includeRoast }: ExternalUserInput) {
      // The trailing slash is part of the backend route; without it the POST 404s.
      return fetcher<StartAnalysisResponse>(`${API_BASE}/pgn/external_user/`, {
        method: 'POST',
        body: { username: username.trim(), platform, include_roast: includeRoast },
      })
    },

    fetchStatus(statusId: string) {
      return fetcher<AnalysisStatusResponse>(
        `${API_BASE}/analysis/status/${encodeURIComponent(statusId)}`,
      )
    },
  }
}

export type AnalysisApi = ReturnType<typeof useAnalysisApi>
