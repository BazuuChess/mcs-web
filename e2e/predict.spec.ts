import { expect, test } from '@playwright/test'
import { horizontalOverflow } from './helpers'

test.describe('predict the next move (simulated)', () => {
  test('is reachable from the navigation and says the predictions are simulated', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Predict a move' })
      .click()

    await expect(page).toHaveURL('/predict')
    await expect(page.getByText('predictions are simulated')).toBeVisible()
  })

  test('renders the board and suggests a move for the starting position', async ({ page }) => {
    await page.goto('/predict')

    await expect(page.locator('cg-board')).toBeVisible()
    await expect(page.getByTestId('side-to-move')).toHaveText('White to move')

    await page.getByRole('button', { name: 'Predict next move' }).click()
    await expect(page.getByTestId('prediction')).toBeVisible()
    await expect(page.getByTestId('prediction-san')).not.toBeEmpty()
    await expect(page.getByTestId('prediction')).toContainText('Simulated confidence')
  })

  test('keeps the board square and inside its card on a landscape screen', async ({ page }) => {
    // The board library sizes itself from the viewport height; it must not spill out of the card.
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/predict')
    await expect(page.locator('cg-board')).toBeVisible()

    const board = (await page.locator('cg-board').boundingBox())!
    const card = (await page.locator('[data-slot="card"]').boundingBox())!

    expect(board.x).toBeGreaterThanOrEqual(card.x)
    expect(board.x + board.width).toBeLessThanOrEqual(card.x + card.width)
    expect(Math.abs(board.width - board.height)).toBeLessThan(2)
  })

  test('loads a FEN, finds the mate in one and draws it', async ({ page }) => {
    await page.goto('/predict')
    await expect(page.locator('cg-board')).toBeVisible()

    await page.getByLabel('Position (FEN)').fill('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1')
    await page.getByRole('button', { name: 'Load' }).click()
    await page.getByRole('button', { name: 'Predict next move' }).click()

    await expect(page.getByTestId('prediction-san')).toHaveText('Ra8#')
    await expect(page.getByTestId('prediction')).toContainText('delivers checkmate')
    await expect(page.locator('svg.cg-shapes line, svg.cg-shapes g')).not.toHaveCount(0)
  })

  test('rejects an invalid FEN', async ({ page }) => {
    await page.goto('/predict')
    await page.getByLabel('Position (FEN)').fill('nonsense')
    await page.getByRole('button', { name: 'Load' }).click()

    await expect(page.getByRole('alert')).toContainText('not a valid FEN')
    await expect(page.getByTestId('prediction')).toHaveCount(0)
  })

  test('explains that a finished game has no next move', async ({ page }) => {
    await page.goto('/predict')
    await page.getByLabel('Position (FEN)').fill('R5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1')
    await page.getByRole('button', { name: 'Load' }).click()
    await page.getByRole('button', { name: 'Predict next move' }).click()

    await expect(page.getByRole('alert')).toContainText('checkmate')
  })

  test('fits a phone screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/predict')
    await expect(page.locator('cg-board')).toBeVisible()
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })
})
