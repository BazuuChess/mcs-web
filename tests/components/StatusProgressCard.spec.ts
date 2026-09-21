import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import StatusProgressCard from '~/components/StatusProgressCard.vue'
import type { AnalysisResult, PollState } from '~/types'

const ID = '123e4567-e89b-12d3-a456-426614174000'
const fileUpload = { status: 'OK', source: 1, usernames: 'magnus' } as const
const game = { count: 1, opponents_avg_rating: {}, openings: [] } as const
const roast = { roast: 'r', encouragement: 'e', tip: 't' }

type Props = {
  result: AnalysisResult | null
  roast: boolean | undefined
  progress: number
  state: PollState
  error: string | null
}

function mountCard(overrides: Partial<Props> = {}) {
  return mountSuspended(StatusProgressCard, {
    props: {
      statusId: ID,
      result: {},
      roast: false,
      progress: 0,
      state: 'polling',
      error: null,
      ...overrides,
    },
  })
}

const pill = (wrapper: Awaited<ReturnType<typeof mountCard>>, key: string) =>
  wrapper.find(`[data-stage="${key}"]`)

describe('StatusProgressCard', () => {
  it('shows the tracking id', async () => {
    expect((await mountCard()).text()).toContain(ID)
  })

  it('shows skeletons, not fake progress, before the first response', async () => {
    const wrapper = await mountCard({ result: null })

    expect(wrapper.find('[aria-label="Loading status"]').exists()).toBe(true)
    expect(wrapper.find('[data-stage]').exists()).toBe(false)
  })

  it('shows a queued state for an empty result instead of hanging on skeletons', async () => {
    const wrapper = await mountCard({ result: {}, progress: 0 })

    expect(wrapper.find('[aria-label="Loading status"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('0%')
    expect(wrapper.text()).toContain('Queued')
    expect(pill(wrapper, 'file_upload').attributes('data-state')).toBe('pending')
  })

  it('marks finished stages done and the rest pending', async () => {
    const wrapper = await mountCard({ result: { file_upload: fileUpload }, progress: 50 })

    expect(pill(wrapper, 'file_upload').attributes('data-state')).toBe('done')
    expect(pill(wrapper, 'file_upload').text()).toContain('Games found')
    expect(pill(wrapper, 'game').attributes('data-state')).toBe('pending')
    expect(pill(wrapper, 'game').text()).toContain('Analyzing games…')
    expect(wrapper.text()).not.toContain('Queued')
  })

  it('treats a stage with an empty-string result as done', async () => {
    const wrapper = await mountCard({ result: { file_upload: '', game: '' }, progress: 100 })

    expect(pill(wrapper, 'file_upload').attributes('data-state')).toBe('done')
    expect(pill(wrapper, 'game').attributes('data-state')).toBe('done')
  })

  it('shows "Roasting in progress…" while a requested roast is pending', async () => {
    const wrapper = await mountCard({ result: { file_upload: fileUpload, game }, roast: true })

    expect(pill(wrapper, 'roasting_user').attributes('data-state')).toBe('pending')
    expect(pill(wrapper, 'roasting_user').text()).toContain('Roasting in progress…')
  })

  it('shows the roast as done once it arrives', async () => {
    const wrapper = await mountCard({
      result: { file_upload: fileUpload, game, roasting_user: roast },
      roast: true,
      progress: 100,
    })

    expect(pill(wrapper, 'roasting_user').text()).toContain('User roasted')
  })

  it('hides the roast pill when no roast was requested', async () => {
    const wrapper = await mountCard({ result: { file_upload: fileUpload }, roast: false })
    expect(pill(wrapper, 'roasting_user').exists()).toBe(false)
  })

  it('always shows the playing-style stage as coming soon', async () => {
    const wrapper = await mountCard({
      result: { file_upload: fileUpload, game, chess_style: '' },
      progress: 100,
    })

    expect(pill(wrapper, 'chess_style').attributes('data-state')).toBe('coming-soon')
    expect(pill(wrapper, 'chess_style').text()).toContain('coming soon')
  })

  it('shows an alert with the error and a Retry that emits retry', async () => {
    const wrapper = await mountCard({
      result: null,
      state: 'error',
      error: 'Please check the Tracking ID you have provided.',
    })

    expect(wrapper.find('[role="alert"]').text()).toContain('Please check the Tracking ID')
    const retry = wrapper.findAll('button').find((b) => b.text().includes('Retry'))!
    await retry.trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('explains a timeout and offers to keep checking', async () => {
    const wrapper = await mountCard({ state: 'timeout' })

    expect(wrapper.find('[role="status"]').text()).toContain('taking longer than expected')
    const again = wrapper.findAll('button').find((b) => b.text().includes('Keep checking'))!
    await again.trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
