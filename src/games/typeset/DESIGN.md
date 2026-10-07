# Typeset ¶ — design notes

Set, in type. Each day has two boards, played as tabs in either order:

- **Character set** — a theme (Letters, Signs & punctuation, Currency,
  Beyond A–Z) and three characters set in one face. The glyph attribute is
  *which character*.
- **Faces** — one letter in three faces from three different families. The
  glyph attribute is *which face*: the board that teaches you to see type.

Each board is 12 cards with **4–8 sets**; the board says how many. Find them
all to solve it; both boards solve the day. Misses are counted, never
penalized. Hints name one fact about one unfound set.

These were settled over four rounds of rendered mockups and two
five-reviewer passes (type designer, printmaker, accessibility, casual
player, house steward, rendering engineer). The reasons are kept here so
they don't get re-argued.

## Fills

| Fill | How it's drawn | Why |
|---|---|---|
| Solid | the ink | — |
| Cross-hatch | 45° lattice over a 25% (dark: 30%) tint of the ink, thin full-ink keyline, no outline | A bare hatch broke € bars and script hairlines into debris; the tint holds thin strokes together, the keyline keeps the silhouette crisp, gestalt closure does the rest. Single-direction hatching was rejected by every reviewer. |
| Open | an outline drawn **outside** the letter (`paint-order: stroke` under a fill of the card color) | An inside band fills a heavy stem completely below ~18px and reads as solid. Outside, every stroke keeps its full width as a hollow channel at any size. The fill on top also hides contour seams. |

In the found-set tray (~14px) a hatch can't resolve, so the middle fill
becomes a flat wash plus keyline. Keyline and outline widths are CSS px
(`non-scaling-stroke`), the same on every card at every Text size.

**Dashed** outlines were the first idea and the first thing dropped: dashes
chop serifs at random, and at tray size dashed and solid outlines are the
same.

## Card layout

A card's copies are set as one row, spaced edge-to-edge by a gap measured
from the ink (13% of the board's mean ink height), not dropped into fixed
slots: fixed square slots left narrow glyphs like `?` and `¶` floating far
apart. Every row on a board shares one height, the lesser of 66% of the
card's height and what lets the board's widest possible row (three of its
widest glyph) fit the card's width. Both terms are container units, so a
glyph is the same size on every card whatever its count.

## Faces

- Every face at its **heaviest weight**. The fills need stems several times
  the outline's width; at regular weights the open fill closes up and the
  hatch has nothing to sit in.
- **No blackletter or hairline scripts** — their open and hatched fills turn
  to noise. Pacifico was dropped for this; Lobster replaced it.
- A faces trio never repeats a family (`pool.test.ts`). On the faces board
  ink heights are equalized so no face reads heavier for being drawn larger.

## Inks

Light `#991b1b / #ca6a04 / #2563eb`, dark `#ef4444 / #fcd34d / #38bdf8`.

- Each ink owns a **lightness rung**, in the same order in both themes (red
  darkest, blue, amber lightest), so a player sorting by lightness reads the
  board the same way. The first red/yellow/blue picked by hue difference
  alone read as two browns on thin outlines in light mode.
- Graphics, not text: **3:1** on the card, not 4.5:1. Amber is 3.8:1 — a
  deliberate step darker than `#d97706` (3.2:1, washed out in glare) but not
  as dark as `#b45309`, which landed on blue's lightness.
- `scripts/validate_palette.js` checks contrast, simulated deuteranopia
  and the lightness order. These are a documented exception to "one palette
  key per game"; the chrome accent is a neutral stone.

## Glyphs

`scripts/bake-typeset-glyphs.py` fetches each OFL face, fails on a missing
character, **removes overlapping contours** (variable fonts build letters
from overlapping pieces; the keyline would trace the seams), and writes SVG
paths. The app ships paths, never fonts: offline, identical everywhere, and
untouched by the Font setting — the cards are art, not text. A pool edit
without a re-bake fails `pool.test.ts`.

## Hints

A hint states a fact about the first unfound set: "An unfound set has one of
each color." Successive hints describe the same set until it's found. The
order is **measured**: each hint is the fact that leaves the most candidate
triples on the board, gentlest first. Over six months of boards the
candidates go 220 → ~60 → ~16 → ~4 → 1.

## Schedule

Two append-only pools, each run in seeded cycles (as Sixfold does), so past
days never move. An entry never repeats within three days across a cycle
boundary. `schedule.test.ts` pins the first week.
