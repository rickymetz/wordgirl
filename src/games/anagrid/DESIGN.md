# Anagrid (working title) — design

A 6×6 letter sudoku built on an anagram family. Two lines of the solved
grid spell two different common words with the same six letters: one
**clued** row, and one **hidden** line (a crossing column, or the main
diagonal) revealed at the finish. Sudoku carries the player most of the
way and then **stalls**; the words break the stall. That is the
difference from plain Wordoku, where the letters are digits in costume
and the word is decoration.

Status: playable — daily, archive, stats, tutorial, hub card and roundup
entry, per the CLAUDE.md new-game checklist. Not launchable yet: see
"Before launch". `anagrid` is a working id (renaming is a folder move
plus the registry entry).

## Decisions

Requirements interviews: the first shaped v1, the second came out of a
design / UX / game-design review of v1; a third note tuned difficulty.
Later rounds override earlier ones.

| Area | Decision |
| --- | --- |
| Board | One 6×6 daily, classic 2×3 boxes. Practice, other sizes, jigsaw layouts deferred. |
| Letters | The six distinct letters of a common-tier anagram family, sorted on the pad (spoils nothing). |
| Word lines | **Mixed geometry:** hidden word on the main diagonal when the family allows it, otherwise an across (clued row) + down (hidden column). Both lines shaded. |
| Core loop *(r2)* | **Late stall.** Givens stay until sudoku alone would leave more than N grids, so singles fill most of the board, then stall on a spot a word settles. |
| Difficulty *(r3)* | **One level every day: medium** (N = 6), sudoku fills ~46% before the stall. The r2 weekday curve was dropped — its easy days (~78% before the stall) made the opening a walk. `DAILY_DIFFICULTY` is the knob. |
| Uniqueness *(r2)* | **Strict:** unique even if BOTH lines may be any dictionary anagram — the other family word in the clued row always hits a repeat. |
| Clues *(r2)* | **Crossword-grade, cryptic-lite** (double definitions, misdirection, `?` puns, fill-ins) — the one place wordplay is allowed; the rest of the UI stays plain. **2–3 per word, rotating** each time a family returns. |
| Word tier | Answers are common-tier; uniqueness is proven against both tiers. |
| Input *(r2)* | **Cell first only** (letter-first dropped): tap a cell, then a letter. |
| Highlights *(r2)* | **Rings, not fills:** thick ring on the selection, thin ring on matching letters; fills only for the word lines; the selection's row/column/box is a wash layered over the fill. |
| Mistakes *(r2)* | Repeats get a **corner mark** plus the warn color, on the player's letters only — a given is never "the mistake". A full, repeat-free, wrong board names the line that isn't its word. |
| Hints *(r2)* | Reveal the **next cell the player's toolkit would deduce** (not the first gap in reading order). The **first hint of the day asks** ("Use a hint?"). |
| Finish *(r2)* | The two words **light up** on the solved board. Share stays time + hints. |
| Results card | Both words, the rest of the family, time, hints, streak, Share. |
| Tagline | Decided with the name ("Sudoku, spelled." breaks the no-wordplay rule). |
| Pool *(r3)* | **168 families**, frozen. 127 promoted by interview (plurals in; a verb form only pairs with a base word, so SORTED/STORED left). *(r4)* LEARNT (British) out of the answers, ANTLER in; same letters, so the schedule is untouched. Frozen as a cycle schedule (`schedule.ts`): append-only with a future `since`, pinned by a test. |
| Clue rotation *(r3)* | **Two straight clues + one cryptic per word**, rotating straight, straight, cryptic. A family's clue advances each cycle it returns (`cycle - since`), so a repeat day never shows the last clue again. Each family starts on its own rung (`clueTurn`: letters hash % 3), so every cycle is about a third cryptic rather than whole cycles going all-cryptic. |
| Cryptics *(r3)* | Real cryptic clues (`cryptic.ts`) — charades, containers, hidden words, homophones, deletions, double definitions; **never anagram wordplay** (the pad already shows the letters). The clue card carries a "Cryptic" tag; the results card shows the parse (`how`). |

## Findings

Reproduce with `MEASURE=1 npx vitest run src/games/anagrid/engine/measure`.

**The diagonal geometry is structurally rare.** A clued row `r` crosses
the diagonal at `(r, r)`, so the words share that letter — but row cell
`(r, j)` also shares column `j` with diagonal cell `(j, j)`, so at every
other position the letters must DIFFER. 8 of 45 common-tier families
allow it (SACRED/SCARED agree in four places and never can). An across +
down pair shares only its crossing cell, so every family allows that.
The common tier alone gave 42 families (after excluding DAVIES/REGINA/
FOWLER, proper nouns the frequency list let in); 127 hand-promoted
families take the pool to **168**, all verified to generate at every
level. A family returns every ~5½ months.

**v1 minimized givens, and the words became the opening, not the
payoff** (from the game-design review, 90 dailies): sudoku placed a
median of 0 cells before the words, both words filled first, and singles
finished every day. Round 2's late-stall generator fixes that:

| Level | Givens (median) | Empties sudoku fills before the stall |
| --- | --- | --- |
| Easy (N = 2) | 10 | ~78% |
| **Medium (N = 6) — every daily** | 9 | ~46% |
| Hard (N = 24) | 9 | ~25% |

Before the stall the opening is singles only, with 1–2 cells open at the
first move. A round-3 check found easy days too easy; the fix chosen was
an earlier stall on every day rather than harder sudoku techniques.

All 42 families make boards at every level; ~18 ms per daily.

**v1 allowed the anagram swap** on 16% of days (the other family word in
the clued row still filled a full, repeat-free grid). v1 generated under
a clue-assumed proof; round 2 proves uniqueness with both lines free.

**A "the clue must be needed" rule can't coexist with strict
uniqueness.** Strict uniqueness means the wrong anagram always hits a
repeat, and the player's toolkit sees that repeat without reading the
clue: 1 board in 378 managed both. So the clue is the fast road to the
row, not the only one; `clueNeeded` is still measured. If the clue must
carry more weight, the lever is the clue's difficulty (done: cryptic-lite),
not the generator.

**Two models of the player, deliberately different.** *Solvability* uses
what a person knows: the clue's row, and a COMMON family word on the
hidden line. *Uniqueness* is proven against every dictionary anagram, so
a player who knows a rare one (DEASIL) never finds a second grid.

## Before launch

- **Clue review.** `engine/clues.ts` + `engine/cryptic.ts` are AI-drafted:
  2 straight clues and 1 cryptic (with its parse) per word, 386 words,
  ~1,150 clues. An AI editor pass (round 4) changed 202: broken parses,
  missing indicators, British devices (RS, CE, lift, EST = "establishment"),
  root-reusing cryptics, tense/number slips, near-duplicate straight pairs,
  and three sibling clashes. Every charade and hidden word is checked
  mechanically against its answer. A HUMAN read is still owed before
  launch — sibling-fit first, since that is the one failure that makes a
  day unfair.
- **Growing the pool later** means: promote in `families.ts`, clue in
  `clues.ts` and `cryptic.ts`, and APPEND to `schedule.ts` with a `since` past the current
  cycle. `schedule.test.ts` fails on anything else.
- **Name + tagline.** Then teaser/OG images and a README section.
- **`ARCHIVE_EPOCH`** to the launch date; teach `?demo-history` the game.

## Build notes

- **Accent:** indigo (`--level-anagrid`, #4338ca / #818cf8), CVD-distinct
  from all five game accents. `validate_palette.js` now resolves named
  game tokens (it silently skipped every game after Polygram). The
  roundup rainbow has a sixth stop.
- **Highlight tokens:** `--anagrid-line` (15% light / 30% dark — dark
  needs double to separate from an empty cell), `--anagrid-peer`,
  `--anagrid-match`.
- **Keyboard / screen readers:** one Tab stop for the grid (roving
  tabindex), arrows move focus with the selection; cell labels name the
  word lines; every placement, erase and hint is narrated.
- **Keys:** the pad borrows 6px of the page gutter each side so all seven
  keys clear 44px from a 375px screen (36-38px at 320px).
- **Cryptic days** carry the longest clues (≤ 38 chars scheduled through
  2027): no scroll at 375×667 Huge in either font. At 320×568 Huge the
  clue wraps to three lines and the board sits on its 44px floor, so the
  page scrolls 17-41px — the app-wide known gap, touch floor winning.
- **Tutorial:** LISTEN across, SILENT down. Four one-gap rows (sudoku),
  then an E/T rectangle only a word settles (the stall), then the clue.
  `tutorial.test.ts` checks every claim against the real solver.
- **Share:** `🔠 Anagrid — <date>` / `⏱️ 4:32 · 😎 0` / URL.
  **Roundup:** unit `letters`, value = cells the player filled.
