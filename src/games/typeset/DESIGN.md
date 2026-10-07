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
apart. Open copies get an extra outline width between them, or a script's
outside outlines meet.

The board is **measured** and dealt into whichever grid draws the glyphs
largest (`fitBoard`). A row is three copies across, so three columns of
portrait cards are width-bound and waste their height: on a phone, two
columns of landscape cards draw the type about half again as large. Every
row on a board shares one px height (80% of the card's height, or what
fits the widest possible row across 86% of its width), so a glyph is the
same size on every card whatever its count. The column count is held once
the board is solved, so the cards keep their shape when the results take
the space. Cards never drop below the 44px touch floor while in play.

Where the board's thinnest stem (measured at bake time, 2 × area /
perimeter) would draw under 4px, the whole board's middle fill becomes the
tray's flat wash: a hatch smears on a stroke that thin. The choice is per
board, never per glyph, so one board never shows the middle fill two ways.

## Status and feedback

Like every sibling, the board has a progress line ("1/4 sets found"), and
hint facts sit on the line under it, which holds its height so a hint never
moves the board. A hint is not also a toast; found/miss toasts sit above
the board, never over the cards. A selected card lifts and wears a check
(a shape change, not only a tint); a card in a found set gets a small dot,
not a cross-out, because a card can belong to more than one set.

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
  key per game". The chrome accent is aubergine: it began as a neutral
  stone so it would never compete with the inks, but beside six saturated
  siblings it read as switched off. Aubergine is the hue farthest from every
  sibling accent and every ink (OKLab ΔE ≥ 12.8 in both themes), so the
  selection ring never reads as a card ink.
- Light amber was tested against an ochre (#a87a00, suggested in review)
  and goldenrod (#b8860b). Ochre sits CLOSER to red under simulated
  deuteranopia; goldenrod separates a little more but fades on white. At
  the larger card sizes the current amber holds, so it stays. Its hatch
  ground is 35% (25% vanished on white).

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
