# Development

## Requirements

- [bun](https://bun.sh) (developed with 1.3). The lockfile is `bun.lock`; do not use npm or pnpm.
- Node is still used by Playwright and by some tooling; a current LTS or newer is fine.
- A running My Chess Style API to use the app for real (optional for development and tests).

## Commands

```sh
bun install
bun run dev          # http://localhost:3000, hot reload
bun run build        # production build into .output/
bun run preview      # serve the build
bun run typecheck    # nuxt typecheck (vue-tsc)
bun run lint         # eslint (bun run lint:fix to auto-fix)
bun run format       # prettier --write app tests e2e
bun run test         # vitest: unit, composable and component tests
bun run test:e2e     # playwright (Chromium), API mocked
```

`bun run dev`, `build` and `preview` run the Nuxt CLI with bun's runtime (`bunx --bun nuxt ...`).
If that ever misbehaves, run the CLI under Node instead (`nuxt dev`) and keep bun as the package
manager only.

## Talking to the API

The browser calls `/server/*`; Nitro proxies it to `<API_PROXY_TARGET>/api/v1/*`
(`nitro.routeRules` in `nuxt.config.ts`). The default target is `http://localhost:8000`, where
`manage.py runserver` listens.

```sh
API_PROXY_TARGET=http://localhost:8000 bun run dev
```

Notes:

- The target is read when `nuxt.config.ts` loads, so it is **fixed at build time**. To point a
  production build somewhere else, rebuild with the variable set.
- Wildcard proxying keeps the trailing slash on `/server/pgn/external_user/`, which the backend
  requires. This was checked against a stand-in server for JSON, multipart and GET requests.
- The real backend needs Postgres, Redis, RabbitMQ and a Celery worker (plus Ollama for roasts). See
  the `my-chess-style` README. Without it, the e2e suite and the unit tests still cover the frontend.
- Large PGN uploads may hit a reverse proxy's request-size limit in deployment (nginx defaults to
  1 MB). Deployment is out of scope here; raise `client_max_body_size` if you deploy behind nginx.

## Tests

| Layer | Where | Tools |
| --- | --- | --- |
| Pure logic (`utils/`) | `tests/unit` | Vitest |
| Composables (API shapes, polling with fake timers) | `tests/composables` | Vitest |
| Components (forms, cards, predictor) | `tests/components` | `@nuxt/test-utils` `mountSuspended`, happy-dom |
| End to end | `e2e/` | Playwright, Chromium, `page.route` mocks for `/server/**` |

Conventions:

- Add or update tests for every testable change (see `CLAUDE.md`).
- `useAnalysisApi` takes an optional fetcher so tests inject a fake instead of stubbing `$fetch`
  (stubbing the global does not reach the Nuxt runtime in the test environment).
- The board component is replaced with a stub in component tests (chessground needs a real browser);
  the real board is exercised by Playwright.
- Playwright starts its own dev server on port 3100 and reuses one if it is already running. First
  Playwright run needs `bunx playwright install chromium`.
- `vite.optimizeDeps.include` pre-bundles the lazily imported dependencies. Without it, Vite
  re-optimizes on the first visit to `/predict` and reloads the page, which made e2e flaky.

## Dependency notes

- **TypeScript is pinned to 5.9** (`~5.9.3`). TypeScript 7 is the native port and `vue-tsc` cannot load
  it yet. Revisit when `vue-tsc` supports it.
- `bun` blocks one postinstall script (`unrs-resolver`, pulled in by the ESLint tooling). Lint,
  typecheck and the tests all run fine without it, so it is left untrusted.
- **vue3-chessboard's CSS is unlayered**, so it beats Tailwind v4's layered utilities even at lower
  specificity. `PositionPredictor.vue` overrides the library's viewport-based board size
  (`.main-wrap { width: 90vh }`) with `!` (important) utilities. Use the same trick for any other
  override of that library's styles. An e2e test checks the board stays inside its card.
- shadcn-vue components: `bunx shadcn-vue@latest add <name>`. They land in `app/components/ui/`.
  Then re-check any hand edits listed in [architecture.md](./architecture.md).

## Change log

- 2026-09-21: Initial development guide.
- 2026-09-21: Documented the vue3-chessboard sizing override after a visual check found the board
  overflowing its card at landscape sizes; added an e2e regression test.
