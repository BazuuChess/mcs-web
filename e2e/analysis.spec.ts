import { expect, test } from '@playwright/test'
import { STATUS_ID, fileUpload, game, horizontalOverflow, json, mockStatus, roast } from './helpers'

test.describe('start an analysis', () => {
  test('uploads a PGN, lands on the status page and shows the results', async ({ page }) => {
    let uploadBody = ''
    await page.route('**/server/pgn/upload', (route) => {
      uploadBody = route.request().postData() ?? ''
      return json(route, { status_id: STATUS_ID })
    })
    // Nothing finished yet, then everything (no roast requested).
    await mockStatus(page, [
      { body: { result: {} } },
      { body: { result: { file_upload: fileUpload, game } } },
    ])

    await page.goto('/')
    const submit = page.getByRole('button', { name: 'Analyze PGN File' })
    await expect(submit).toBeDisabled()

    await page.locator('input[type="file"]').setInputFiles({
      name: 'games.pgn',
      mimeType: 'application/x-chess-pgn',
      buffer: Buffer.from('[Event "Test"]\n\n1. e4 e5 *'),
    })
    await page.getByPlaceholder('Enter your chess username').fill('magnus')
    await expect(submit).toBeEnabled()
    await submit.click()

    await expect(page).toHaveURL(new RegExp(`/status/${STATUS_ID}\\?roast=0$`))
    expect(uploadBody).toContain('name="usernames"')
    expect(uploadBody).toContain('magnus')
    expect(uploadBody).toContain('name="include_roast"')
    expect(uploadBody).toContain('false')

    // First response is `{}`: a queued state, not an endless skeleton.
    await expect(page.getByText('Queued, waiting for the first stage')).toBeVisible()

    // The next poll (3s later) brings the results.
    await expect(page.getByText('Preliminary Game Analysis')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('win-rate')).toContainText('50.0%')
    await expect(page.getByText('Sicilian Defense: Najdorf Variation')).toBeVisible()
    await expect(page.getByText('100%')).toBeVisible()
    await expect(page.getByText('Playing style: coming soon')).toBeVisible()
    // No roast was requested, so no roast card and no roast pill.
    await expect(page.getByText('AI Roast')).toHaveCount(0)
    await expect(page.getByText('Roasting in progress…')).toHaveCount(0)
  })

  test('sends the platform username with the roast flag and shows the roast', async ({ page }) => {
    let payload: unknown
    await page.route('**/server/pgn/external_user/', (route) => {
      payload = route.request().postDataJSON()
      return json(route, { status_id: STATUS_ID })
    })
    await mockStatus(page, [
      { body: { result: { file_upload: fileUpload, game } } },
      { body: { result: { file_upload: fileUpload, game, roasting_user: roast } } },
    ])

    await page.goto('/')
    await page.getByRole('tab', { name: 'Enter Username' }).click()
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Lichess' }).click()
    await page.getByPlaceholder('Enter your username').fill('hikaru')
    await page.getByRole('switch').click()
    await page.getByRole('button', { name: 'Analyze Games' }).click()

    await expect(page).toHaveURL(new RegExp(`/status/${STATUS_ID}\\?roast=1$`))
    expect(payload).toEqual({ username: 'hikaru', platform: 'lichess', include_roast: true })

    // The roast was requested, so it shows as pending until it arrives.
    await expect(page.getByText('Roasting in progress…')).toBeVisible()
    await expect(page.getByText('You hang your queen.')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Nice endgames.')).toBeVisible()
    await expect(page.getByText('Check twice.')).toBeVisible()
    await expect(page.getByText('User roasted')).toBeVisible()
  })

  test('defaults to Chess.com when no platform is chosen', async ({ page }) => {
    let payload: unknown
    await page.route('**/server/pgn/external_user/', (route) => {
      payload = route.request().postDataJSON()
      return json(route, { status_id: STATUS_ID })
    })
    await mockStatus(page, [{ body: { result: {} } }])

    await page.goto('/')
    await page.getByRole('tab', { name: 'Enter Username' }).click()
    await page.getByPlaceholder('Enter your username').fill('hikaru')
    await page.getByRole('button', { name: 'Analyze Games' }).click()

    await expect(page).toHaveURL(/\/status\//)
    expect(payload).toMatchObject({ platform: 'chess.com' })
  })

  test('shows the backend message and stays put when the user does not exist', async ({ page }) => {
    await page.route('**/server/pgn/external_user/', (route) =>
      json(route, { message: 'User has not been found on Lichess' }, 404),
    )

    await page.goto('/')
    await page.getByRole('tab', { name: 'Enter Username' }).click()
    await page.getByPlaceholder('Enter your username').fill('nobody')
    await page.getByRole('button', { name: 'Analyze Games' }).click()

    await expect(page.getByText('User has not been found on Lichess')).toBeVisible()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('button', { name: 'Analyze Games' })).toBeEnabled()
  })
})

test.describe('track an existing analysis', () => {
  test('rejects a malformed id and explains the format', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: 'Track Progress' }).click()
    const submit = page.getByRole('button', { name: 'Track Progress by ID' })

    await page.getByLabel('Tracking ID').fill('CGA-1234567890-ABC123')
    await expect(submit).toBeDisabled()
    await expect(page.getByText('A tracking ID looks like')).toBeVisible()

    await page.getByLabel('Tracking ID').fill(STATUS_ID)
    await expect(submit).toBeEnabled()
  })

  test('opens the status page for a valid id and shows what has finished', async ({ page }) => {
    const requests = await mockStatus(page, [
      { body: { result: { file_upload: fileUpload, game } } },
    ])

    await page.goto('/')
    await page.getByRole('tab', { name: 'Track Progress' }).click()
    await page.getByLabel('Tracking ID').fill(STATUS_ID)
    await page.getByRole('button', { name: 'Track Progress by ID' }).click()

    await expect(page).toHaveURL(`/status/${STATUS_ID}`)
    await expect(page.getByText('Preliminary Game Analysis')).toBeVisible()
    await expect(page.getByText('Lichess')).toHaveCount(0)
    await expect(page.getByText('Chess.com', { exact: true })).toBeVisible()
    expect(requests[0]).toContain(`/server/analysis/status/${STATUS_ID}`)
  })

  test('shows the backend error and lets the user retry', async ({ page }) => {
    await mockStatus(page, [
      { status: 400, body: { detail: 'Please check the Tracking ID you have provided.' } },
      { body: { result: { file_upload: fileUpload, game } } },
    ])

    await page.goto(`/status/${STATUS_ID}`)
    await expect(page.getByRole('alert')).toContainText(
      'Please check the Tracking ID you have provided.',
    )

    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(page.getByText('Preliminary Game Analysis')).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('says so when the user has no games', async ({ page }) => {
    await mockStatus(page, [
      {
        body: {
          result: {
            file_upload: fileUpload,
            game: { opponents_avg_rating: {}, openings: [] },
          },
        },
      },
    ])

    await page.goto(`/status/${STATUS_ID}`)
    await expect(page.getByText('No games played by user')).toBeVisible()
  })
})

test.describe('small screens', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('the start page does not scroll sideways', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Analyze PGN File' })).toBeVisible()
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })

  test('the status page does not scroll sideways', async ({ page }) => {
    await mockStatus(page, [
      { body: { result: { file_upload: fileUpload, game, roasting_user: roast } } },
    ])
    await page.goto(`/status/${STATUS_ID}?roast=1`)
    await expect(page.getByText('You hang your queen.')).toBeVisible()
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })
})
