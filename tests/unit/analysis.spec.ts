import { describe, expect, it } from 'vitest'
import type { AnalysisResult, GameData } from '~/types'

const UUID = '123e4567-e89b-12d3-a456-426614174000'

const fileUpload = { status: 'OK', source: 1, usernames: 'magnus' } as const
const game: GameData = {
  count: 10,
  win_count: 5,
  draw_count: 2,
  loss_count: 3,
  opponents_avg_rating: { blitz: 1500 },
  openings: [],
}
const roast = { roast: 'r', encouragement: 'e', tip: 't' }

describe('isUuid', () => {
  it('accepts a UUID, in any case and with surrounding whitespace', () => {
    expect(isUuid(UUID)).toBe(true)
    expect(isUuid(UUID.toUpperCase())).toBe(true)
    expect(isUuid(`  ${UUID}  `)).toBe(true)
  })

  it.each(['', 'abc', 'CGA-1234567890-ABC123', `${UUID}0`, '123e4567e89b12d3a456426614174000'])(
    'rejects %j',
    (value) => {
      expect(isUuid(value)).toBe(false)
    },
  )
})

describe('hasStage / stageData', () => {
  it('treats a present key as done even when its value is an empty string', () => {
    expect(hasStage({ game: '' }, 'game')).toBe(true)
    expect(hasStage({}, 'game')).toBe(false)
  })

  it('turns empty or missing stage values into null', () => {
    expect(stageData('')).toBeNull()
    expect(stageData(undefined)).toBeNull()
    expect(stageData(roast)).toEqual(roast)
  })
})

describe('applicableStages', () => {
  it('excludes the roast when it was not requested', () => {
    expect(applicableStages({}, false)).toEqual(['file_upload', 'game'])
  })

  it('includes the roast when it was requested', () => {
    expect(applicableStages({}, true)).toEqual(['file_upload', 'game', 'roasting_user'])
  })

  it('includes an unrequested-but-unknown roast only once it appears', () => {
    expect(applicableStages({}, undefined)).toEqual(['file_upload', 'game'])
    expect(applicableStages({ roasting_user: roast }, undefined)).toContain('roasting_user')
  })

  it('never counts chess_style', () => {
    expect(applicableStages({ chess_style: {} }, true)).not.toContain('chess_style')
  })
})

describe('stageState', () => {
  it('reports chess_style as coming soon, whatever the result', () => {
    expect(stageState({}, 'chess_style', true)).toBe('coming-soon')
    expect(stageState({ chess_style: '' }, 'chess_style', true)).toBe('coming-soon')
  })

  it('reports present keys as done, including empty-string values', () => {
    expect(stageState({ file_upload: fileUpload }, 'file_upload', false)).toBe('done')
    expect(stageState({ game: '' }, 'game', false)).toBe('done')
  })

  it('reports absent keys as pending', () => {
    expect(stageState({}, 'file_upload', false)).toBe('pending')
    expect(stageState({}, 'roasting_user', true)).toBe('pending')
  })

  it('skips the roast when it was not requested or is unknown and absent', () => {
    expect(stageState({}, 'roasting_user', false)).toBe('skipped')
    expect(stageState({}, 'roasting_user', undefined)).toBe('skipped')
  })

  it('still shows a roast that arrived although none was expected', () => {
    expect(stageState({ roasting_user: roast }, 'roasting_user', false)).toBe('done')
  })
})

describe('progressPercent', () => {
  it('is 0 for an empty result, not a fake 100 or NaN', () => {
    expect(progressPercent({}, false)).toBe(0)
    expect(progressPercent({}, true)).toBe(0)
  })

  it('counts stages without a roast', () => {
    expect(progressPercent({ file_upload: fileUpload }, false)).toBe(50)
    expect(progressPercent({ file_upload: fileUpload, game }, false)).toBe(100)
  })

  it('counts the roast stage when requested', () => {
    expect(progressPercent({ file_upload: fileUpload }, true)).toBe(33)
    expect(progressPercent({ file_upload: fileUpload, game }, true)).toBe(67)
    expect(progressPercent({ file_upload: fileUpload, game, roasting_user: roast }, true)).toBe(100)
  })

  it('counts empty-string results as done', () => {
    expect(progressPercent({ file_upload: '', game: '' }, false)).toBe(100)
  })

  it('reaches 100 even though chess_style never completes', () => {
    const result: AnalysisResult = { file_upload: fileUpload, game }
    expect(progressPercent(result, false)).toBe(100)
  })
})

describe('isAnalysisComplete', () => {
  it('needs the game stage', () => {
    expect(isAnalysisComplete({ file_upload: fileUpload }, false)).toBe(false)
    expect(isAnalysisComplete({ game }, false)).toBe(true)
  })

  it('also needs the roast when one was requested', () => {
    expect(isAnalysisComplete({ game }, true)).toBe(false)
    expect(isAnalysisComplete({ game, roasting_user: roast }, true)).toBe(true)
  })

  it('does not wait for a roast when it is unknown (the caller adds a grace window)', () => {
    expect(isAnalysisComplete({ game }, undefined)).toBe(true)
  })
})

describe('sourceLabel', () => {
  it.each([
    [1, 'Chess.com'],
    [2, 'Lichess'],
    [3, 'PGN file'],
    [9, 'Unknown'],
    [undefined, 'Unknown'],
  ])('maps %s to %s', (source, label) => {
    expect(sourceLabel(source)).toBe(label)
  })
})

describe('winRates', () => {
  it('returns percentages', () => {
    expect(winRates(game)).toEqual({ win: 50, draw: 20, loss: 30 })
  })

  it('returns null when there are no games', () => {
    expect(winRates({ opponents_avg_rating: {}, openings: [] })).toBeNull()
    expect(winRates({ ...game, count: 0 })).toBeNull()
  })

  it('treats missing counts as zero', () => {
    expect(winRates({ ...game, win_count: undefined })).toEqual({ win: 0, draw: 20, loss: 30 })
  })
})

describe('formatters', () => {
  it('formats percentages to one decimal', () => {
    expect(formatPercent(66.666)).toBe('66.7%')
    expect(formatPercent(0)).toBe('0.0%')
  })

  it('formats ratings as whole numbers and shows a dash when there are no games', () => {
    expect(formatRating(1523.4)).toBe('1523')
    expect(formatRating(0)).toBe('–')
    expect(formatRating(undefined)).toBe('–')
  })
})
