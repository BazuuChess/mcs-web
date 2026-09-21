# Colorscheme

Source of truth for the app's colors. The original swatches are in
[`colorscheme.jpeg`](./colorscheme.jpeg) (generated with color.adobe.com). The tokens below are
implemented in `app/assets/css/main.css`; change this file first, then that one.

Light theme only, as in the reference app (`my-chess-style/frontend`), whose dark-mode block was
commented out.

## Palette

| Hex       | RGB          | Name   | Token                  | Used for |
| --------- | ------------ | ------ | ---------------------- | -------- |
| `#7A3530` | 122, 53, 48  | Maroon | `primary`              | Buttons, the title, active nav, focus ring, progress bar, result headings |
| `#E16264` | 225, 98, 100 | Coral  | `highlight`            | Brand highlights: the left border of the "encouragement" block (on a neutral `muted` fill), the title's hover underline |
| `#D65453` | 214, 84, 83  | Brick  | `destructive`          | Errors, the loss tile, the roast block, destructive buttons |
| `#BE8936` | 190, 137, 54 | Gold   | `warning`              | The draw tile, the "taking longer than expected" notice |
| `#27D190` | 39, 209, 144 | Mint   | `success`              | The win tile, finished stages, the tips block, a suggested move |

Coral and brick are close in hue, so they have separate jobs: coral is decoration only, brick always
means something went wrong or was lost. Never place them side by side to mean different things.
This was confirmed visually: an "encouragement" block tinted with coral looked identical to the brick
"roast" block above it, so coral is used only as a border on a neutral fill.

### Why coral is `highlight`, not `accent`

shadcn uses `accent` as the neutral hover/selected surface (menu items, ghost buttons, the nav hover).
Making it coral would tint every hover. So `accent` stays a neutral and the coral lives in a separate
`highlight` token. This is a deliberate change from the first draft of this document.

## Neutrals

Carried over from the reference app's shadcn slate neutrals, with one change.

| Token                              | Value                    |
| ---------------------------------- | ------------------------ |
| `background`, `card`, `popover`    | `#ffffff`                |
| `foreground`, `*-foreground` (see below) | `hsl(222.2 84% 4.9%)` ("ink") |
| `muted`, `secondary`, `accent`     | `hsl(210 40% 96.1%)`     |
| `muted-foreground`                 | `hsl(215.3 19.3% 34.5%)` |
| `border`, `input`                  | `#dddddd`                |
| `ring`                             | `#7a3530` (primary)      |

**`muted-foreground` differs from the reference** (`hsl(215.4 16.3% 46.9%)`): that value is 4.3:1 on
`muted`, below the 4.5:1 AA minimum for normal text, and the app puts small captions on `muted`
tiles. The new value is 7.6:1 on white and 6.9:1 on `muted`.

Typography from the reference: Poppins, 15px base size.

## Contrast (WCAG)

Ratios against white and against ink (`#020817`). AA needs 4.5:1 for normal text and 3:1 for large
text and UI components.

| Color             | vs white | vs ink | As text on white?    | Text placed on it |
| ----------------- | -------- | ------ | -------------------- | ----------------- |
| Maroon `#7A3530`  | 8.8      | 2.3    | Yes                  | white             |
| Coral `#E16264`   | 3.4      | 5.8    | No (large text only) | ink               |
| Brick `#D65453`   | 4.0      | 5.0    | No (large text only) | ink               |
| Gold `#BE8936`    | 3.1      | 6.5    | No (large text only) | ink               |
| Mint `#27D190`    | 2.0      | 10.1   | No                   | ink               |

Rules that follow:

- Only maroon is used as text, or as a thin line, on white.
- Coral, brick, gold and mint are fills, borders and icons. Text on them is ink, never white. So
  `destructive-foreground`, `warning-foreground`, `success-foreground` and `highlight-foreground` are
  all ink, unlike shadcn's usual white on destructive.
- Status panels use a light tint of the color (`bg-success/25`, `bg-destructive/15`, ...) with ink
  text: 14.5:1 or better in every case. Secondary text on those tints (`muted-foreground`) is 5.5:1
  or better.
- Never rely on color alone. Win/draw/loss tiles carry an icon and a label; stage pills carry a check
  or icon and text; errors carry text.

## Tokens

```css
:root {
  --radius: 0.5rem;

  --background: #ffffff;
  --foreground: hsl(222.2 84% 4.9%);
  --card: #ffffff;
  --card-foreground: hsl(222.2 84% 4.9%);
  --popover: #ffffff;
  --popover-foreground: hsl(222.2 84% 4.9%);

  --primary: #7a3530;
  --primary-foreground: #ffffff;

  --secondary: hsl(210 40% 96.1%);
  --secondary-foreground: hsl(222.2 84% 4.9%);
  --muted: hsl(210 40% 96.1%);
  --muted-foreground: hsl(215.3 19.3% 34.5%);
  --accent: hsl(210 40% 96.1%);
  --accent-foreground: hsl(222.2 84% 4.9%);

  --highlight: #e16264;
  --highlight-foreground: hsl(222.2 84% 4.9%);
  --destructive: #d65453;
  --destructive-foreground: hsl(222.2 84% 4.9%);
  --warning: #be8936;
  --warning-foreground: hsl(222.2 84% 4.9%);
  --success: #27d190;
  --success-foreground: hsl(222.2 84% 4.9%);

  --border: #dddddd;
  --input: #dddddd;
  --ring: #7a3530;
}
```

`app/assets/css/main.css` maps each of these to a Tailwind color in an `@theme inline` block
(`--color-primary: var(--primary)`, and so on), so utilities like `bg-success/25` and
`text-primary` work. `highlight`, `warning` and `success` are additions to stock shadcn.

## Hand edits to generated components

`app/components/ui/button/index.ts`: the `destructive` variant uses `text-destructive-foreground`
(ink) instead of shadcn's `text-white`, to follow the contrast rules above. Re-apply after any
`shadcn-vue add button --overwrite`.

## Change log

- 2026-09-21: Initial write-up. Palette from `colorscheme.jpeg`; neutrals, light-only decision and
  typography from the reference `my-chess-style/frontend`. Role mapping proposed with maroon as primary.
- 2026-09-21: Implemented in `main.css`. Coral moved from `accent` to a new `highlight` token
  (shadcn's `accent` is the neutral hover surface). Added `card`, `popover` and `secondary` tokens.
  Darkened `muted-foreground` for AA on `muted`. Documented the tint-plus-ink pattern for status
  panels and the Button `destructive` hand edit.
- 2026-09-21: After reviewing screenshots, the "encouragement" block changed from a coral tint to a
  neutral `muted` fill with a coral left border (coral and brick tints were indistinguishable).
