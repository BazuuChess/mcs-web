import type { Page, Route } from '@playwright/test'

export const STATUS_ID = '123e4567-e89b-12d3-a456-426614174000'

export const fileUpload = { status: 'OK', source: 1, usernames: 'magnus' }

export const game = {
  count: 8,
  win_count: 4,
  draw_count: 1,
  loss_count: 3,
  opponents_avg_rating: { bullet: 1234.5, blitz: 1500, rapid: 0, classical: 0 },
  openings: [['Sicilian Defense: Najdorf Variation', { total: 5, eco_codes: ['B90', 'B91'] }]],
}

export const roast = {
  roast: 'You hang your queen.',
  encouragement: 'Nice endgames.',
  tip: 'Check twice.',
}

export const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

/**
 * Answers `GET /server/analysis/status/*` with each response in turn, repeating the last one.
 * Returns the list of requested URLs.
 */
export async function mockStatus(page: Page, responses: { status?: number; body: unknown }[]) {
  const requests: string[] = []
  await page.route('**/server/analysis/status/**', (route) => {
    const next = responses[Math.min(requests.length, responses.length - 1)]!
    requests.push(route.request().url())
    return json(route, next.body, next.status)
  })
  return requests
}

export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}
