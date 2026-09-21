// Shapes of the My Chess Style API (see docs/api.md). Field names mirror the backend on purpose.

export type Platform = 'chess.com' | 'lichess'

export type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'classical'

export interface StartAnalysisResponse {
  status_id: string
}

/** 1 = Chess.com, 2 = Lichess, 3 = uploaded PGN file. */
export type GameSource = 1 | 2 | 3

export interface FileUploadData {
  status: string
  source: GameSource
  usernames: string
}

export interface OpeningStats {
  total: number
  eco_codes: string[]
}

/** `[opening full name, stats]`, already sorted by `total` (descending) by the backend. */
export type Opening = [string, OpeningStats]

/** `count` and the win/draw/loss counts are absent when the user has no games. */
export interface GameData {
  count?: number
  win_count?: number
  draw_count?: number
  loss_count?: number
  opponents_avg_rating: Partial<Record<TimeControl, number>>
  openings: Opening[]
}

export interface RoastData {
  roast: string
  encouragement: string
  tip: string
}

/**
 * Keys appear as each stage finishes. A finished stage whose task returned nothing is `''`, so
 * "is the stage done" means "is the key present", never "is the value truthy".
 */
export interface AnalysisResult {
  file_upload?: FileUploadData | ''
  game?: GameData | ''
  roasting_user?: RoastData | ''
  /** Not implemented by the backend yet: never present. */
  chess_style?: unknown
}

export interface AnalysisStatusResponse {
  result: AnalysisResult
}

export type StageKey = 'file_upload' | 'game' | 'roasting_user' | 'chess_style'

/** `skipped` = the roast was not requested. `coming-soon` = the backend doesn't produce it yet. */
export type StageState = 'done' | 'pending' | 'skipped' | 'coming-soon'

export type PollState = 'idle' | 'polling' | 'done' | 'error' | 'timeout'

export type PredictionReason = 'checkmate' | 'capture' | 'check' | 'first-legal'

export interface PredictedMove {
  /** e.g. `e2e4`, or `e7e8q` for a promotion. */
  uci: string
  san: string
  from: string
  to: string
  /** Simulated: the mock backend does not compute a real probability. */
  confidence: number
  reason: PredictionReason
}

export interface PredictApi {
  predictNextMove(fen: string): Promise<PredictedMove>
}
