import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import BasicInfoCard from '~/components/BasicInfoCard.vue'
import GamesAnalysisCard from '~/components/GamesAnalysisCard.vue'
import RoastCard from '~/components/RoastCard.vue'
import type { GameData } from '~/types'

const game: GameData = {
  count: 8,
  win_count: 4,
  draw_count: 1,
  loss_count: 3,
  opponents_avg_rating: { bullet: 1234.5, blitz: 1500, rapid: 0 },
  openings: [
    ['Sicilian Defense: Najdorf Variation', { total: 5, eco_codes: ['B90', 'B91'] }],
    ['Italian Game', { total: 2, eco_codes: ['C50'] }],
  ],
}

describe('GamesAnalysisCard', () => {
  it('shows totals and win/draw/loss rates', async () => {
    const wrapper = await mountSuspended(GamesAnalysisCard, { props: { game } })

    expect(wrapper.text()).toContain('Total games')
    expect(wrapper.find('[data-testid="win-rate"]').text()).toContain('50.0%')
    expect(wrapper.find('[data-testid="win-rate"]').text()).toContain('(4 games)')
    expect(wrapper.find('[data-testid="draw-rate"]').text()).toContain('12.5%')
    expect(wrapper.find('[data-testid="loss-rate"]').text()).toContain('37.5%')
  })

  it('shows opponent ratings per time control, with a dash where there are no games', async () => {
    const text = (await mountSuspended(GamesAnalysisCard, { props: { game } })).text()

    expect(text).toContain('1235') // bullet, rounded
    expect(text).toContain('1500') // blitz
    expect(text).toContain('–') // rapid = 0 and classical missing
  })

  it('lists the top openings with ECO codes and game counts', async () => {
    const text = (await mountSuspended(GamesAnalysisCard, { props: { game } })).text()

    expect(text).toContain('Sicilian Defense: Najdorf Variation')
    expect(text).toContain('ECO: B90, B91')
    expect(text).toContain('Italian Game')
  })

  it.each([
    ['no data (empty stage result)', null],
    ['no count key', { opponents_avg_rating: {}, openings: [] } satisfies GameData],
    ['count of zero', { ...game, count: 0 }],
  ])('says so when the user has no games: %s', async (_name, value) => {
    const wrapper = await mountSuspended(GamesAnalysisCard, { props: { game: value } })

    expect(wrapper.text()).toContain('No games played by user')
    expect(wrapper.find('[data-testid="win-rate"]').exists()).toBe(false)
  })
})

describe('BasicInfoCard', () => {
  it('shows the username and a readable source', async () => {
    const wrapper = await mountSuspended(BasicInfoCard, {
      props: { info: { status: 'OK', source: 2, usernames: 'DrNykterstein' } },
    })

    expect(wrapper.text()).toContain('DrNykterstein')
    expect(wrapper.text()).toContain('Lichess')
  })

  it('handles an empty stage result', async () => {
    const wrapper = await mountSuspended(BasicInfoCard, { props: { info: null } })
    expect(wrapper.text()).toContain('No details available')
  })
})

describe('RoastCard', () => {
  it('renders the roast, encouragement and tip', async () => {
    const wrapper = await mountSuspended(RoastCard, {
      props: {
        roast: {
          roast: 'You hang your queen.',
          encouragement: 'Nice endgames.',
          tip: 'Check twice.',
        },
      },
    })

    expect(wrapper.find('[data-section="roast"]').text()).toContain('You hang your queen.')
    expect(wrapper.find('[data-section="encouragement"]').text()).toContain('Nice endgames.')
    expect(wrapper.find('[data-section="tip"]').text()).toContain('Check twice.')
  })

  it('omits empty sections (the backend leaves them blank when the LLM fails)', async () => {
    const wrapper = await mountSuspended(RoastCard, {
      props: {
        roast: {
          roast: "Sorry, couldn't generate a roast right now.",
          encouragement: '',
          tip: '',
        },
      },
    })

    expect(wrapper.find('[data-section="roast"]').exists()).toBe(true)
    expect(wrapper.find('[data-section="encouragement"]').exists()).toBe(false)
    expect(wrapper.find('[data-section="tip"]').exists()).toBe(false)
  })

  it('handles an empty stage result', async () => {
    const wrapper = await mountSuspended(RoastCard, { props: { roast: null } })
    expect(wrapper.text()).toContain('No roast was generated.')
  })
})
