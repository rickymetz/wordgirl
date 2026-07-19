---
title: Charts
description: The Tufte house style — sparklines, range frames, gaps not zeros, and one accent per chart.
---

Every chart in WordGirl follows one style, and `GameTrends`
(`src/components/GameTrends.tsx`) is its reference implementation — extend
it rather than hand-rolling.

## The house style

Tufte: **maximize data-ink.**

- **Sparkline-scale marks** — small single-series lines (168×64 SVG in
  GameTrends), not full charts with chrome.
- **A range frame** spanning only the played days is the sole scaffold — no
  gridlines, no axis rules.
- **Direct labels on the extremes** instead of axes; a Best/Avg subtitle
  carries the summary.
- **Gaps, not zeros, for missing days.** A metric returns `null` for a day
  it can't speak to — an unplayed day, or a day saved before the metric
  shipped. A fake zero is a lie about the data.
- **Values on tap** — tapping a sparkline picks the nearest day and shows
  its value; there are no hover tooltips to miss on touch.

The solve-hour histogram follows the same rules: accent bars, a baseline,
four clock ticks, and a single peak/tapped label.

## Color

- **One accent hue per chart** — the chart inherits the game's `data-level`
  accent, full stop.
- **Cross-game comparison charts are banned.** The four game accents were
  validated as a categorical palette and fail (contrast and color-vision
  separability), so games are never charted against each other.

## Process for any new chart

1. Design the form first — what marks, what scaffold, what labels.
2. Color last, always the in-scope accent.
3. Run `scripts/validate_palette.js` if any new color is involved — never
   eyeball color-vision safety or contrast.

## Adding a metric to a game's trends page

Metrics read from the archive day saves. A new metric needs a new save
field, which accrues **from ship day** — earlier days chart as gaps via
`null`. Route the page at `stats` with a "Stats" secondary action, and
include the `solvedHour` metric so the histogram has data.
