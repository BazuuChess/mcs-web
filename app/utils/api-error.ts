interface ErrorLike {
  data?: unknown
  status?: number
  statusCode?: number
  message?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * The API reports errors three ways: `{message}` (pgn routes), `{detail: string}` (status route)
 * and `{detail: [{msg, loc}]}` (422 validation). Flatten all of them into one readable string.
 */
export function parseApiError(err: unknown): string {
  const fallback = 'Something went wrong. Please try again.'
  if (!isRecord(err)) return typeof err === 'string' && err ? err : fallback

  const { data, status, statusCode } = err as ErrorLike

  if (isRecord(data)) {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.detail === 'string' && data.detail) return data.detail
    if (Array.isArray(data.detail)) {
      const messages = data.detail
        .map((item) => (isRecord(item) && typeof item.msg === 'string' ? item.msg : null))
        .filter((msg): msg is string => Boolean(msg))
      if (messages.length) return messages.join('; ')
    }
  }

  const code = status ?? statusCode
  if (code) return `The request failed (HTTP ${code}).`
  return 'Could not reach the server. Check your connection and try again.'
}
