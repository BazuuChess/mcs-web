import { Chess } from 'chess.js'
import type { PredictedMove, PredictionReason } from '~/types'

export type PredictErrorCode = 'invalid-fen' | 'no-legal-moves'

export class PredictError extends Error {
  constructor(
    public readonly code: PredictErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'PredictError'
  }
}

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

const CONFIDENCE: Record<PredictionReason, number> = {
  checkmate: 0.99,
  capture: 0.6,
  check: 0.5,
  'first-legal': 0.3,
}

export function isValidFen(fen: string): boolean {
  try {
    new Chess(fen.trim())
    return true
  } catch {
    return false
  }
}

/**
 * Stand-in for the missing backend endpoint. Deterministic on purpose so tests are stable:
 * checkmate, else the most valuable capture, else a check, else the first legal move.
 * It is NOT a chess engine.
 */
export function pickMockMove(fen: string): PredictedMove {
  let chess: Chess
  try {
    chess = new Chess(fen.trim())
  } catch {
    throw new PredictError('invalid-fen', 'That is not a valid FEN position.')
  }

  const moves = chess.moves({ verbose: true })
  if (moves.length === 0) {
    throw new PredictError(
      'no-legal-moves',
      chess.isCheckmate() ? 'The game is over: checkmate.' : 'The game is over: no legal moves.',
    )
  }

  const mate = moves.find((move) => move.san.endsWith('#'))
  const captures = moves
    .filter((move) => move.captured)
    .sort((a, b) => (PIECE_VALUE[b.captured!] ?? 0) - (PIECE_VALUE[a.captured!] ?? 0))
  const check = moves.find((move) => move.san.endsWith('+'))

  const [move, reason]: [(typeof moves)[number], PredictionReason] = mate
    ? [mate, 'checkmate']
    : captures[0]
      ? [captures[0], 'capture']
      : check
        ? [check, 'check']
        : [moves[0]!, 'first-legal']

  return {
    uci: `${move.from}${move.to}${move.promotion ?? ''}`,
    san: move.san,
    from: move.from,
    to: move.to,
    confidence: CONFIDENCE[reason],
    reason,
  }
}
