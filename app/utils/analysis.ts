import type {
  AnalysisResult,
  FileUploadData,
  GameData,
  GameSource,
  RoastData,
  StageKey,
  StageState,
} from '~/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim())
}

/** A stage is done when its key is present, even if the value is `''`. */
export function hasStage(result: AnalysisResult, key: StageKey): boolean {
  return key in result
}

/**
 * Turns a stage value into data, or `null` when the stage finished with an empty result (`''`) or
 * hasn't finished at all.
 */
export function stageData<T extends FileUploadData | GameData | RoastData>(
  value: T | '' | undefined,
): T | null {
  return value === undefined || value === '' ? null : value
}

/**
 * Stages that count toward progress. `chess_style` never does. `roasting_user` counts when a roast
 * was requested; when that is unknown (tracking ID typed in by hand) it counts only once it appears.
 */
export function applicableStages(result: AnalysisResult, roast: boolean | undefined): StageKey[] {
  const stages: StageKey[] = ['file_upload', 'game']
  if (roast === true || (roast === undefined && hasStage(result, 'roasting_user'))) {
    stages.push('roasting_user')
  }
  return stages
}

export function stageState(
  result: AnalysisResult,
  key: StageKey,
  roast: boolean | undefined,
): StageState {
  if (key === 'chess_style') return 'coming-soon'
  if (hasStage(result, key)) return 'done'
  if (key === 'roasting_user' && !applicableStages(result, roast).includes(key)) return 'skipped'
  return 'pending'
}

/** 0-100, whole number. */
export function progressPercent(result: AnalysisResult, roast: boolean | undefined): number {
  const stages = applicableStages(result, roast)
  const done = stages.filter((key) => hasStage(result, key)).length
  return Math.round((done / stages.length) * 100)
}

/**
 * Whether polling can stop. With an unknown roast flag the roast is optional here; the caller adds
 * a grace window for it.
 */
export function isAnalysisComplete(result: AnalysisResult, roast: boolean | undefined): boolean {
  if (!hasStage(result, 'game')) return false
  if (roast === true) return hasStage(result, 'roasting_user')
  return true
}

const SOURCE_LABELS: Record<GameSource, string> = {
  1: 'Chess.com',
  2: 'Lichess',
  3: 'PGN file',
}

export function sourceLabel(source: number | undefined): string {
  return SOURCE_LABELS[source as GameSource] ?? 'Unknown'
}

export interface WinRates {
  win: number
  draw: number
  loss: number
}

/** Percentages (0-100), or `null` when the user has no games. */
export function winRates(game: GameData): WinRates | null {
  const { count, win_count = 0, draw_count = 0, loss_count = 0 } = game
  if (!count) return null
  return {
    win: (win_count / count) * 100,
    draw: (draw_count / count) * 100,
    loss: (loss_count / count) * 100,
  }
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatRating(value: number | undefined): string {
  return value ? value.toFixed(0) : '–'
}
