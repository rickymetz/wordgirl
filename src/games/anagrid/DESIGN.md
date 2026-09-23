# Anagrid (working title) — design

A 6×6 letter sudoku built on an anagram family. Two lines of the solved
grid spell two different common words with the same six letters: one
**clued** row, and one **hidden** line revealed at the finish. Sudoku
rules alone never pin the grid down — the words have to do some of the
work. That is the difference from plain Wordoku, where the letters are
digits in costume and the word is decoration.

Status: playable — daily, archive, stats, tutorial, hub card and
roundup entry, per the CLAUDE.md new-game checklist. The name is
undecided; `anagrid` is a working id (a folder move plus the registry
entry to rename). See "Build notes" below for what shipped and what
didn't.

## Decisions (requirements interview)

| Area | Decision |
| --- | --- |
| Board | One 6×6 daily, classic 2×3 boxes. Other sizes and practice deferred. Jigsaw regions dropped for v1 (see findings). |
| Letters | The six distinct letters of a common-tier anagram family. The letter pad shows them sorted, so it spoils nothing. |
| Word lines | **Mixed geometry:** hidden word on the main diagonal when the family allows it, otherwise a crossword-style across (clued row) + down (hidden column). |
| Clue | One short clue for the clued row, visible from the start. Written with AI offline, reviewed by hand, shipped as data — no runtime network. |
| Hidden word | Not clued, not marked as spelled out; revealed on the results card. |
| Word tier | Answers are common-tier only. Uniqueness is proven against BOTH tiers (see below). |
| Word dependence | Every daily must be ambiguous under sudoku rules alone. A family that can't manage it is skipped for the next in line. |
| Givens | The fewest that keep the board unique and solvable with the player's toolkit. |
| Difficulty | Easy-medium, 3-6 min: the toolkit is singles plus word lines, no pencil-mark chains. |
| Input | Letter pad; cell-first by default with a letter-first toggle. |
| Assists | Highlight same letter; highlight the selected cell's row/column/box. No pencil marks. |
| Mistakes | Conflicts only (duplicate in a row/column/box turns red). No wrong-vs-solution check, no lives. |
| Word lines on screen | Outlined on the board AND listed as `?` blanks (`data-glyph`). |
| Hints | Reveal one cell; each counts toward the roundup hint total. |
| Result | Time only (+ hints). Board freezes on solve. |
| Results card | Time, hints, streak, hidden word revealed, and the whole family ("LADIES · IDEALS · also SAILED"). |
| Share | `emoji name · time hints` + `SHARE_URL`, per house format. |
| Hub | Last in registry order. Accent: whatever passes `validate_palette.js`. |
| Tutorial | Sudoku rule first, then the clue, then "only one real word fits the hidden line", then finish. |
| Seed repeats | Families cycle in a fixed shuffled order with a fresh board each cycle; grow the pool with a hand-reviewed allowlist (`PROMOTED_WORDS`). |

## Findings from the spike

Run `MEASURE=1 npx vitest run src/games/anagrid/engine/measure` to
reproduce (`MEASURE=diagonal|cross` forces a geometry,
`MEASURE_PROOF=open` drops the clue from the uniqueness proof).

**The diagonal geometry is structurally rare.** A clued row `r` crosses
the diagonal at `(r, r)`, so the two words must share that letter — but
row cell `(r, j)` also shares column `j` with diagonal cell `(j, j)`, so
at every other position the letters must DIFFER. Two anagrams that
agree in exactly one place are uncommon: SACRED/SCARED agree in four
and can never pair. Of the 45 common-tier families, 8 allow a diagonal
pairing; 6 of those make a box board.

**Across + down works for every family.** A row and a column share only
their crossing cell, so any two family words pair wherever the across's
letter `c` equals the down's letter `r`.

| Geometry (common tier) | Families that can pair | Box boards made |
| --- | --- | --- |
| Diagonal + row | 8 / 45 | 6 |
| Across + down | 45 / 45 | 45 |
| Two parallel rows | 14 / 45 | not built |
| Diagonal + anti-diagonal | 2 / 45 | not built |

With the mixed rule every family makes a board: **6 diagonal days,
the rest across + down**. Three "common" words turned out to be proper
nouns from the subtitle-frequency list (DAVIES, REGINA, FOWLER); they
are excluded (`EXCLUDED_WORDS`), which orphans their families, so the
live pool is **42 families**. Diagonal boards need 1-3 givens; across + down
boards 3-7. Both pass the stricter `open` proof too.

**Two models of the player, deliberately different.**
- *Solvability* uses what a person actually knows: the clue gives its
  row, and the hidden line is one of the family's COMMON words. The
  first spike let the solver search every dictionary anagram (DEASIL,
  GANDER…), which no player does.
- *Uniqueness* is proven against every dictionary anagram, both tiers,
  so a player who does know DEASIL never finds a second valid grid.

**Jigsaw regions weren't needed.** Planned as a fallback for families
that can't make a word-dependent box board; with across + down, none
can't. 40 candidate layouts were generated and measured, then dropped.
`isValidLayout` stays for when irregular layouts return for variety.

## Open items

- **Pool size vs repeat gap.** 42 families means a family returns every
  42 days; the interview asked for a 60-day minimum gap. That needs 15+
  more families via `PROMOTED_WORDS` (hand-reviewed bonus-tier words —
  471 all-tier families allow a diagonal, 1,216 allow across + down).
- **Clues.** `engine/clues.ts` holds AI-drafted clues for all 86 pool
  words, marked as drafts: they need the human review pass before
  launch. `clues.test.ts` enforces coverage, length, and that no clue
  names its own family.
- **Difficulty tuning.** Diagonal days run on 1-3 givens and lean
  harder on word knowledge than across + down days. Measure real solve
  times before deciding whether to floor the givens.
- **Name.** Still open.
- **Everything else** follows the CLAUDE.md new-game checklist:
  persistence, clock, archive, trends, roundup entry, coach sheet,
  tutorial, the three test files.

## Build notes

- **Deferred per the interview:** Practice mode (no route, no bento
  tile), other board sizes, jigsaw layouts.
- **Accent:** indigo (`--level-anagrid`, #4338ca / #818cf8) — 7.9:1 and
  5.7:1, and CVD-distinct from all five game accents.
  `validate_palette.js` only resolved numeric `--level-N` tokens, so it
  never checked ANY named game accent; it now does, and all six pass.
  The roundup rainbow gains a sixth stop.
- **Share:** `🔠 Anagrid — <date>` / `⏱️ 4:32 · 😎 0` / URL.
- **Roundup:** unit `letters`, value = cells the player filled.
- **Wrong-but-full board:** a full grid with no repeats that isn't the
  solution (a word line isn't a word) gets a toast rather than a solve;
  nothing else is checked, per "conflicts only".
- **Tutorial:** LISTEN across, SILENT down, one E/T rectangle only the
  clue resolves. At Huge text on a 375×667 it drops the blanks legend
  and the entry-order toggle and hides the title row, or it scrolls
  145px. 320×568 at Huge still scrolls — the documented app-wide gap.
- **Replay:** solved archive days offer "Play again" behind a
  `ModalDialog`.
- **Not done:** the `?demo-history` seeder doesn't know this game yet,
  and there are no teaser/OG images or README section until it has a
  name.
