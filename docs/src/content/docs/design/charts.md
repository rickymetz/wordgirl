---
title: Charts
description: The chart style — small lines, direct labels, gaps for missing days, one accent for each chart.
---

Each chart in WordGirl uses one style. The component `GameTrends` (`src/components/GameTrends.tsx`) is the example. Extend it. Do not make a new chart system.

## The style

The style shows the data with the minimum of decoration:

- The marks are small. One chart is a small line of 168 by 64 pixels.
- The only frame is a range frame. It goes only across the played days. There are no grid lines and no axis lines.
- The labels are on the highest and lowest points. There are no axes. A small line below the title shows the best value and the average value.
- A day without data shows as a gap. It does not show as a zero. A zero that is not real is incorrect data.
- A touch on the chart shows the value of the nearest day. There are no hover tooltips.

The solve hour chart follows the same rules. It has accent bars, a base line, four clock marks, and one label.

## Color

- Each chart uses one accent color. The chart gets the accent of its game area.
- Charts that compare games are not permitted. The four game accents are not sufficient as one set. The color tests showed this.

## Procedure for a new chart

1. Design the form first. Select the marks, the frame, and the labels.
2. Apply color last. Use the accent of the area.
3. If you add a new color, use `scripts/validate_palette.js`. Do not examine colors with your eyes only.

## Procedure for a new metric

A metric reads the saved days from the archive. A new metric needs a new field in the saved day. The field gets data from the day of its release. Older days show as gaps through `null`. Put the page at the route `stats`. Include the `solvedHour` metric. Then the hour chart has data.
