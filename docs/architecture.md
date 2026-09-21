# Architecture

`mcs-web` is the browser frontend for the [My Chess Style API](https://github.com/BazuuChess/mcs-api).
It is a Nuxt 4 single-page app (`ssr: false`) built with shadcn-vue and Tailwind CSS v4. It rebuilds
the earlier Vue 3 + PrimeVue frontend from the `my-chess-style` repo on this stack.

## Features

| Route | What it does |
| --- | --- |
| `/` | Start an analysis: upload a PGN file, enter a Chess.com/Lichess username, or track an existing analysis by ID |
| `/status/:id` | Live status of one analysis: progress, basic info, game stats, optional AI roast |
| `/predict` | Board where you set up a position and ask for the next move. **Predictions are simulated** (see below) |

## Stack

- **Nuxt 4**, TypeScript, SPA mode (`ssr: false`): the board and clipboard code are browser-only, and
  the reference app was a SPA too.
- **shadcn-vue** (via `shadcn-nuxt`) on **reka-ui**, **Tailwind CSS v4** (`@tailwindcss/vite`).
  No PrimeVue. Generated components live in `app/components/ui/` and are excluded from ESLint and
  Prettier so `shadcn-vue add` stays a clean diff. Two edits were made by hand: see
  [colorscheme.md](./colorscheme.md) (Button `destructive` text colour).
- **Icons:** `@lucide/vue`. **Toasts:** `vue-sonner` (shadcn's Sonner). **Font:** Poppins via `@nuxt/fonts`.
- **Board:** `vue3-chessboard` (chessground + chess.js). It was last released in March 2024; if it
  becomes a problem, use chessground and chess.js directly.
- **Tooling:** bun, ESLint (`@nuxt/eslint`), Prettier, Vitest 5 + `@nuxt/test-utils`, Playwright.
- No Pinia store: the reference app's only store was a toast helper, which Sonner replaces.

## Layout

```
nuxt.config.ts            ssr:false, modules, /server proxy, dep pre-bundling
components.json           shadcn-vue config
app/
  app.vue                 header + nav + <NuxtPage/> + toaster
  assets/css/main.css     Tailwind + colour tokens (source of truth: docs/colorscheme.md)
  pages/                  index.vue, status/[id].vue, predict.vue (thin: they compose components)
  components/
    AnalysisStartCard.vue         tab shell
    UploadPgnForm.vue  ExternalUserForm.vue  TrackProgressForm.vue  RoastToggle.vue
    StatusProgressCard.vue        progress bar, stage pills, error/timeout states
    BasicInfoCard.vue  GamesAnalysisCard.vue  RoastCard.vue
    PositionPredictor.vue         board, FEN input, prediction result
    ui/                           generated shadcn-vue components
  composables/
    useAnalysisApi.ts       the three API calls (`$fetch`, injectable for tests)
    useAnalysisStatus.ts    polling
    useStartAnalysis.ts     submit -> navigate to the status page, shared by the two start forms
    usePredictApi.ts        PredictApi interface + mock implementation
  utils/
    analysis.ts             pure helpers: isUuid, stageState, progressPercent, winRates, ...
    api-error.ts            parseApiError
    predict-mock.ts         the mock move picker (chess.js)
  types/index.ts            API + UI types
tests/                    Vitest (unit, composables, components)
e2e/                      Playwright, with the API mocked
```

Pages hold no logic beyond reading the route; components take data as props, and the composables and
`utils/` hold the behaviour, which is what the tests target.

## Data flow

```
Start form ──POST──▶ /server/pgn/upload | /server/pgn/external_user/ ──▶ { status_id }
     │
     └─ navigateTo /status/<status_id>?roast=1|0
                          │
                          ▼
   useAnalysisStatus ──GET every 3 s──▶ /server/analysis/status/<id> ──▶ { result: { <stage>: ... } }
                          │
                          ▼
   StatusProgressCard + BasicInfoCard + GamesAnalysisCard + RoastCard
```

`/server/*` is proxied by Nitro (`nitro.routeRules`) to `<API_PROXY_TARGET>/api/v1/*`, so the browser
only talks to its own origin and the API needs no CORS. See [development.md](./development.md).

### Why the roast flag is in the URL

The backend records whether a roast was requested but the status endpoint does not return it, and the
roast is produced last. Without the flag the page cannot tell "no roast requested" from "roast still
coming". The start forms know the answer, so they pass it as `?roast=1|0`. When a user types a
tracking ID by hand the flag is unknown, and the page falls back to a grace window (below).

### Polling rules (`useAnalysisStatus`)

- First request immediately, then every 3 s.
- A stage is **done when its key is present** in `result`, even if the value is `""`. `{}` means "queued",
  which is different from "no response yet" (skeleton).
- Finished when `game` is present and, if a roast was requested, `roasting_user` is too. With an
  unknown flag, keep polling for 60 s after `game` appears in case a roast follows.
- Stops on any request error (shown with a Retry button), after 10 minutes (shown with "Keep
  checking"), and when the component unmounts. It does not fetch while the tab is hidden.
- Progress = finished stages / applicable stages. `chess_style` is never counted.

### Playing style is "coming soon"

The backend task for the playing-style stage is a stub that never produces a result. The status page
lists it as "Playing style: coming soon" and leaves it out of the progress percentage so an analysis
can reach 100%. When the backend implements it, update `stageState` and `applicableStages` in
`app/utils/analysis.ts`, add a card, and update this document and [api.md](./api.md).

### Next-move prediction is simulated

The backend has no prediction endpoint. `usePredictApi()` returns a `PredictApi`
(`predictNextMove(fen)`) backed by `utils/predict-mock.ts`: checkmate, else the most valuable
capture, else a check, else the first legal move. It is deterministic and is not an engine. The page
says so in a badge and in its text. To go live, replace the body of `predictNextMove` with a `$fetch`
to the real endpoint and keep the interface; see [api.md](./api.md) for the assumed contract.

## Testing

See [development.md](./development.md#tests). In short: pure logic and composables are unit tested,
components are tested with `mountSuspended`, and Playwright drives the real app in Chromium with every
`/server/**` call mocked, so nothing needs a backend.

## Change log

- 2026-09-21: Initial architecture. Nuxt 4 + shadcn-vue app with the start page, polling status page
  and simulated next-move prediction, plus unit, component and e2e tests.
