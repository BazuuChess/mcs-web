import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PositionPredictor from '~/components/PositionPredictor.vue'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

const mocks = vi.hoisted(() => ({
  board: {
    getFen: vi.fn(),
    setPosition: vi.fn(),
    resetBoard: vi.fn(),
    setShapes: vi.fn(),
    drawMove: vi.fn(),
    toggleOrientation: vi.fn(),
  },
  predictNextMove: vi.fn(),
}))

// chessground needs a real browser. Replace the board with a stub that hands over a fake API.
vi.mock('vue3-chessboard', async () => {
  const { defineComponent, h, onMounted } = await import('vue')
  return {
    TheChessboard: defineComponent({
      emits: ['boardCreated', 'move'],
      setup(_props, { emit }) {
        onMounted(() => emit('boardCreated', mocks.board))
        return () => h('div', { 'data-testid': 'board' })
      },
    }),
  }
})
vi.mock('vue3-chessboard/style.css', () => ({}))

mockNuxtImport('usePredictApi', () => () => ({ predictNextMove: mocks.predictNextMove }))

beforeEach(() => {
  Object.values(mocks.board).forEach((fn) => fn.mockReset())
  mocks.board.getFen.mockReturnValue(START)
  mocks.predictNextMove.mockReset()
})

const button = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(text))!

describe('PositionPredictor', () => {
  it('labels the feature as a preview with simulated predictions', async () => {
    const wrapper = await mountSuspended(PositionPredictor)
    expect(wrapper.text()).toContain('predictions are simulated')
  })

  it('starts from the position reported by the board', async () => {
    const wrapper = await mountSuspended(PositionPredictor)
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe(START)
    expect(wrapper.find('[data-testid="side-to-move"]').text()).toBe('White to move')
  })

  it('rejects an invalid FEN without touching the board', async () => {
    const wrapper = await mountSuspended(PositionPredictor)
    await wrapper.find('input').setValue('definitely not a fen')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('[role="alert"]').text()).toContain('not a valid FEN')
    expect(mocks.board.setPosition).not.toHaveBeenCalled()
  })

  it('loads a valid FEN onto the board and updates the side to move', async () => {
    const wrapper = await mountSuspended(PositionPredictor)
    await wrapper.find('input').setValue(AFTER_E4)
    await wrapper.find('form').trigger('submit')

    expect(mocks.board.setPosition).toHaveBeenCalledWith(AFTER_E4)
    expect(wrapper.find('[data-testid="side-to-move"]').text()).toBe('Black to move')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('shows the predicted move and draws it on the board', async () => {
    mocks.predictNextMove.mockResolvedValue({
      uci: 'e2e4',
      san: 'e4',
      from: 'e2',
      to: 'e4',
      confidence: 0.3,
      reason: 'first-legal',
    })
    const wrapper = await mountSuspended(PositionPredictor)
    await button(wrapper, 'Predict next move').trigger('click')
    await flushPromises()

    expect(mocks.predictNextMove).toHaveBeenCalledWith(START)
    const result = wrapper.find('[data-testid="prediction"]')
    expect(result.find('[data-testid="prediction-san"]').text()).toBe('e4')
    expect(result.text()).toContain('e2e4')
    expect(result.text()).toContain('Simulated confidence: 30%')
    expect(mocks.board.drawMove).toHaveBeenCalledWith('e2', 'e4', 'green')
  })

  it('shows a clear message when the game is already over', async () => {
    const { PredictError } = await import('~/utils/predict-mock')
    mocks.predictNextMove.mockRejectedValue(
      new PredictError('no-legal-moves', 'The game is over: checkmate.'),
    )
    const wrapper = await mountSuspended(PositionPredictor)
    await button(wrapper, 'Predict next move').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('The game is over: checkmate.')
    expect(wrapper.find('[data-testid="prediction"]').exists()).toBe(false)
    expect(mocks.board.drawMove).not.toHaveBeenCalled()
  })

  it('clears the previous suggestion when the position changes', async () => {
    mocks.predictNextMove.mockResolvedValue({
      uci: 'e2e4',
      san: 'e4',
      from: 'e2',
      to: 'e4',
      confidence: 0.3,
      reason: 'first-legal',
    })
    const wrapper = await mountSuspended(PositionPredictor)
    await button(wrapper, 'Predict next move').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="prediction"]').exists()).toBe(true)

    await wrapper.find('input').setValue(AFTER_E4)
    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('[data-testid="prediction"]').exists()).toBe(false)
    expect(mocks.board.setShapes).toHaveBeenCalledWith([])
  })

  it('resets the board', async () => {
    const wrapper = await mountSuspended(PositionPredictor)
    await button(wrapper, 'Reset').trigger('click')
    expect(mocks.board.resetBoard).toHaveBeenCalled()
  })
})
