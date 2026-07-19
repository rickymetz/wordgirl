---
title: Color & theming
description: light-dark() tokens, the data-level accent system, and the contrast rules every game palette must clear.
---

## One mechanism for dark mode

Every color in the app is a **`light-dark()` pair** defined in
`src/index.css`. The `<html>` element sets `color-scheme: light dark`, so
the system theme resolves every token; the Settings dialog forces a theme by
setting `html[data-theme="light" | "dark"]`, which just overrides
`color-scheme`. There are no duplicated dark-mode token blocks, and **no
hex value ever appears in a component** — components read tokens via
Tailwind utilities or `var()`.

Core tokens:

| Token | Role |
|-------|------|
| `--color-surface` / `surface-raised` | background layers (#fff / #121116 base) |
| `--color-ink` / `ink-soft` | text |
| `--color-line` | borders |
| `--color-tile` | the neutral warm-grey tile fill |
| `--color-accent` / `accent-soft` | the in-scope accent |
| `--color-surface-tint` | accent-tinted panel fill |
| `--color-good` / `--color-warn` | semantic feedback |

## The `data-level` accent system

Each game owns **one palette key**, declared as
`GameDefinition.accentLevel`. Setting `data-level="<key>"` on a container
swaps `--color-accent` in that scope, and the `[data-level]` rule
*re-derives* the dependent tokens from it:

- `--color-accent-soft` — 27% mix of accent over surface
- `--color-surface-tint` — 6% accent over surface-raised in light mode,
  13% in dark

Numeric keys 3–10 are the Polygram level hues (pride-flag order, red → sky);
named keys are `crosshatch` (teal), `backwords` (fuchsia, plus a glass
gradient), `doublet` (amber), `serpentine` (lime), and `neutral`
(black/white). The root accent is **neutral black/white** — the hub and
settings are monochrome — and every game surface (game screen, archive,
practice, stats) is scoped with its own `data-level`.

## Contrast rules

- Light-mode accents are ~700-weight shades: **accent text on surface and
  surface text on accent must both clear WCAG AA (4.5:1)**.
- Run `scripts/validate_palette.js` after adding or changing any accent —
  never eyeball contrast or color-vision safety.
- The four game accents **fail as a categorical set** (validated) — which
  is why cross-game color-coding is banned; see [Charts](/docs/design/charts/).

## Tinted panels

Panels use `bg-surface-tint`. Elements *on* a tinted panel punch out with
`bg-surface` — never `bg-tile`, which is a warm grey tuned for plain
surfaces and reads as a stain on tint. The same rule shows up in the kit:
`Tile tone="surface"` and `TileSocket subdued` exist exactly for tinted
panels.
