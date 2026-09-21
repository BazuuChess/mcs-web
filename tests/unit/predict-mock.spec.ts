import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('pickMockMove', () => {
  it('falls back to a legal move when nothing is forcing', () => {
    const move = pickMockMove(START)
    expect(move.reason).toBe('first-legal')
    const legal = new Chess(START).moves({ verbose: true }).map((m) => `${m.from}${m.to}`)
    expect(legal).toContain(move.uci)
  })

  it('is deterministic', () => {
    expect(pickMockMove(START)).toEqual(pickMockMove(START))
  })

  it('plays checkmate in one when available', () => {
    const move = pickMockMove('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1')
    expect(move).toMatchObject({ san: 'Ra8#', uci: 'a1a8', reason: 'checkmate' })
  })

  it('prefers the most valuable capture', () => {
    // Rook can take the h1 knight or the d5 queen.
    const move = pickMockMove('4k3/8/8/3q4/8/8/4K3/3R3n w - - 0 1')
    expect(move).toMatchObject({ san: 'Rxd5', reason: 'capture', from: 'd1', to: 'd5' })
  })

  it('gives check when there is no capture or mate', () => {
    const move = pickMockMove('4k3/8/8/8/8/8/8/R3K3 w - - 0 1')
    expect(move).toMatchObject({ san: 'Ra8+', reason: 'check' })
  })

  it('includes the promotion piece in the UCI string', () => {
    const move = pickMockMove('8/P6k/8/8/8/8/8/K7 w - - 0 1')
    expect(move.uci).toMatch(/^a7a8[qrbn]$/)
  })

  it('reports simulated confidence between 0 and 1', () => {
    const { confidence } = pickMockMove(START)
    expect(confidence).toBeGreaterThan(0)
    expect(confidence).toBeLessThanOrEqual(1)
  })

  it('rejects an invalid FEN', () => {
    expect(() => pickMockMove('not a fen')).toThrowError(PredictError)
    try {
      pickMockMove('not a fen')
    } catch (err) {
      expect((err as PredictError).code).toBe('invalid-fen')
    }
  })

  it('reports stalemate when there are no legal moves', () => {
    try {
      pickMockMove('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(PredictError)
      expect((err as PredictError).code).toBe('no-legal-moves')
    }
  })

  it('reports checkmate when the side to move is mated', () => {
    try {
      pickMockMove('R5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect((err as PredictError).code).toBe('no-legal-moves')
      expect((err as PredictError).message).toMatch(/checkmate/i)
    }
  })
})

describe('isValidFen', () => {
  it('accepts the start position and trims whitespace', () => {
    expect(isValidFen(START)).toBe(true)
    expect(isValidFen(`  ${START}\n`)).toBe(true)
  })

  it.each(['', 'nonsense', '8/8/8/8/8/8/8/8 w - - 0 1'])('rejects %j', (fen) => {
    expect(isValidFen(fen)).toBe(false)
  })
})
