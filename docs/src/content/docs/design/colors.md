---
title: Color and themes
description: The color tokens, the accent system, and the contrast rules.
---

## One mechanism for dark mode

Each color in the application is a `light-dark()` pair in `src/index.css`. The `html` element sets `color-scheme: light dark`. Thus the system theme selects each color. The settings dialog sets `html[data-theme]` to apply a theme manually. There are no separate dark mode blocks. Do not write a hex color in a component. Read the tokens with Tailwind utilities or `var()`.

The tokens are in this table:

| Token | Use |
|-------|------|
| `--color-surface`, `surface-raised` | background layers |
| `--color-ink`, `ink-soft` | text |
| `--color-line` | borders |
| `--color-tile` | the gray tile color |
| `--color-accent`, `accent-soft` | the accent in this area |
| `--color-surface-tint` | panels with an accent tint |
| `--color-good`, `--color-warn` | feedback |

## The data-level accent system

Each game has one accent key. The key is in `GameDefinition.accentLevel`. Set `data-level="<key>"` on an element. Then `--color-accent` changes in that area. The rule for `[data-level]` also calculates these tokens again:

- `--color-accent-soft` is a mix of 27 percent accent and surface.
- `--color-surface-tint` is a mix of 6 percent accent (light mode) or 13 percent (dark mode) and surface-raised.

The number keys 3 to 10 are the Polygram level colors. The name keys are `crosshatch` (teal), `pierglass` (fuchsia), `doublet` (amber), `serpentine` (lime), and `neutral` (black and white). The root accent is neutral black and white. The hub and the settings have no color accent. Each game surface sets its own `data-level`. The game surfaces are the game screen, the archive, the practice mode, and the stats.

## Contrast rules

- The light mode accents are dark tones. Accent text on the surface must have a contrast of 4.5 to 1 or more. Surface text on the accent must also have this contrast. This is the WCAG AA level.
- Use `scripts/validate_palette.js` after each accent change. Do not examine contrast with your eyes only.
- The four game accents are not sufficient as one chart set. The tests showed this. Thus charts with more than one game are not permitted. Refer to [Charts](/docs/design/charts/).

## Tinted panels

Panels use `bg-surface-tint`. An element on a tinted panel uses `bg-surface`. Do not use `bg-tile` on a tinted panel. That gray is for plain surfaces. On a tint, it looks like a stain. The kit has the same rule. `Tile` with the tone `surface` and `TileSocket` with `subdued` are for tinted panels.
