import { describe, expect, it } from 'vitest'

describe('parseApiError', () => {
  it('reads {message} from the pgn routes', () => {
    const err = { data: { message: 'User has not been found on Lichess' }, status: 404 }
    expect(parseApiError(err)).toBe('User has not been found on Lichess')
  })

  it('reads {detail: string} from the status route', () => {
    const err = { data: { detail: 'Please check the Tracking ID you have provided.' }, status: 400 }
    expect(parseApiError(err)).toBe('Please check the Tracking ID you have provided.')
  })

  it('joins validation messages from {detail: [...]}', () => {
    const err = {
      data: {
        detail: [
          { type: 'missing', loc: ['body', 'username'], msg: 'Field required' },
          { type: 'enum', loc: ['body', 'platform'], msg: 'Input should be lichess or chess.com' },
        ],
      },
      status: 422,
    }
    expect(parseApiError(err)).toBe('Field required; Input should be lichess or chess.com')
  })

  it('falls back to the status code when the body has no usable message', () => {
    expect(parseApiError({ data: { detail: [{ loc: [] }] }, status: 422 })).toBe(
      'The request failed (HTTP 422).',
    )
    expect(parseApiError({ data: '<html>', statusCode: 502 })).toBe(
      'The request failed (HTTP 502).',
    )
  })

  it('reports a network failure when there is no response at all', () => {
    expect(parseApiError(new TypeError('fetch failed'))).toMatch(/could not reach the server/i)
  })

  it('accepts a plain string', () => {
    expect(parseApiError('boom')).toBe('boom')
  })

  it.each([null, undefined, 42, ''])(
    'never returns "[object Object]" or an empty string for %j',
    (err) => {
      const message = parseApiError(err)
      expect(message).not.toBe('')
      expect(message).not.toContain('[object')
    },
  )
})
