# mcs-web (My Chess Style Web)

This is a repo of the frontend application for the [My Chess Style](https://github.com/BazuuChess/mcs-api)

## Features

- Users view a report of the statistics of their games.
    - Users provides their username - either Chess.com or Lichess.
    - MCS then shows the users their stats and more importantly their playing style.
- MCS can predict the next move of the user when given a specific chess position.
    - The API has no prediction endpoint yet, so this runs on a simulated stand-in and is labelled as a preview.
    - The playing-style result is not produced by the API yet either; the status page shows it as "coming soon".


## Stack

- Nuxt 4
- Shadcn (shadcn-vue), Tailwind CSS v4
- bun, Vitest, Playwright

## Getting started

Install [bun](https://bun.sh), then:

```sh
bun install
bun run dev
```

The app runs at <http://localhost:3000> and proxies `/server/*` to the API at
`http://localhost:8000` (`/api/v1/*`). Point it elsewhere with `API_PROXY_TARGET`:

```sh
API_PROXY_TARGET=http://localhost:8000 bun run dev
```

```sh
bun run test        # unit + component tests
bun run test:e2e    # end-to-end tests (API mocked); first run: bunx playwright install chromium
bun run lint
bun run typecheck
```

## Documentation

All changes are recorded in [`docs/`](./docs):

- [architecture.md](./docs/architecture.md): structure, data flow, polling rules
- [api.md](./docs/api.md): the API contract the app relies on
- [development.md](./docs/development.md): commands, proxy, tests, dependency notes
- [colorscheme.md](./docs/colorscheme.md): colors and contrast rules
