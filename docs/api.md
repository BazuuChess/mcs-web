# API contract

What the frontend depends on. Verified against the backend code and `openapi/openapi.json` in the
`my-chess-style` repo (Django + django-ninja). If the backend changes, update this file and
`app/types/index.ts` together.

The browser calls `/server/<path>`; Nitro rewrites that to `<API>/api/v1/<path>`
(see [development.md](./development.md)). There is no auth and no CORS.

## Endpoints

### `POST /server/pgn/upload`

`multipart/form-data`:

| Field | Type | Notes |
| --- | --- | --- |
| `pgn_file` | file | Plain UTF-8 PGN text. Archives are not handled |
| `usernames` | string | One username, or several separated by `\|\|`. Matched case-insensitively against the PGN White/Black tags |
| `include_roast` | `"true"` / `"false"` | Sent as a form string |

Returns `200 { "status_id": "<uuid>" }`.

### `POST /server/pgn/external_user/`

**The trailing slash is part of the route.** Without it the POST fails.

`application/json`:

```json
{ "username": "hikaru", "platform": "lichess", "include_roast": false }
```

`platform` is `"chess.com"` (default) or `"lichess"`. Returns `200 { "status_id": "<uuid>" }`.
The user's existence is checked before the job is queued: an unknown user gives
`404 { "message": "User has not been found on Chess.com" }` (or `... on Lichess`).

### `GET /server/analysis/status/{status_id}`

Returns `200 { "result": { ... } }`. Each key appears when that stage finishes:

| Key | When present | Value |
| --- | --- | --- |
| `file_upload` | Games were fetched and saved | `{ status: "OK", source: 1 \| 2 \| 3, usernames: string }` (1 Chess.com, 2 Lichess, 3 file) |
| `game` | Statistics are ready | see below |
| `roasting_user` | Roast finished. **Only if `include_roast` was true** | `{ roast, encouragement, tip }` |
| `chess_style` | **Never**: the backend task is a stub | |

`game`:

```jsonc
{
  "count": 8, "win_count": 4, "draw_count": 1, "loss_count": 3,
  "opponents_avg_rating": { "bullet": 1234.5, "blitz": 1500, "rapid": 0, "classical": 0 },
  "openings": [["Sicilian Defense: Najdorf Variation", { "total": 5, "eco_codes": ["B90", "B91"] }]]
}
```

- At most 5 openings, sorted by `total` descending. A rating of `0` means no games in that time control.
- A user with no games gives `{ "openings": [], "opponents_avg_rating": {} }` with **no `count`**.
- A finished stage whose task returned nothing has the value `""`, so "done" means "key present".
- If the roast model fails: `{ "roast": "Sorry, couldn't generate a roast right now.", "encouragement": "", "tip": "" }`.

Quirks to design around:

- There is **no state or "failed" field**. Progress is inferred from which keys exist.
- An unknown but well-formed UUID returns `200 { "result": {} }`, not 404.
- The response does not say whether a roast was requested (hence `?roast=` in the status URL; see
  [architecture.md](./architecture.md)).
- Failed tasks are not surfaced, so a stuck analysis looks like a slow one. The frontend stops after
  10 minutes.

## Errors

| Shape | Where | Example |
| --- | --- | --- |
| `{ "message": string }` | pgn routes (404 user not found, upstream errors) | `{ "message": "User has not been found on Lichess" }` |
| `{ "detail": string }` | status route, 400 for a non-UUID id | `{ "detail": "Please check the Tracking ID you have provided." }` |
| `{ "detail": [{ "type", "loc", "msg" }] }` | 422 validation, any route | |

`parseApiError` (`app/utils/api-error.ts`) flattens all three into one string, and falls back to the
HTTP status or a "could not reach the server" message.

## Next-move prediction (mocked: no backend endpoint)

The README lists it as a feature, but the backend has no such endpoint. The frontend codes against
this **assumed** contract, which the mock implements (`PredictApi` in `app/types/index.ts`):

```ts
predictNextMove(fen: string): Promise<{
  uci: string        // "e2e4", "e7e8q" for a promotion
  san: string        // "e4"
  from: string       // "e2"
  to: string         // "e4"
  confidence: number // 0..1, simulated by the mock
  reason: 'checkmate' | 'capture' | 'check' | 'first-legal' // mock-only; drop when real
}>
```

Errors: an invalid FEN, or a position with no legal moves (checkmate/stalemate). When the real
endpoint exists, agree the real shape with the backend, change `PredictApi`, and update this section.

## Change log

- 2026-09-21: Initial write-up from the backend code and OpenAPI spec.
