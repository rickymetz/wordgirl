# Polygram's bonus tier: what completion could mean

Working notes for the problem the six-persona review surfaced. Nothing
here is implemented — this branch is for deciding, not doing.

## The short version

Cutting the score (#89) replaced Polygram's headline with a completion
count. That only works if completion means something. Measured against
120 real dailies, it does not, for two independent reasons — and the
second one is worse than the review said, because I had only looked at
one board.

## What I measured

Generated the first 120 dailies from 2026-07-01 against the real
dictionary:

```
required words   avg 17.4    min 3    max 35
bonus words      avg 142.1   min 3    max 615

bonus tier as a share of every word on the board
  average 80.6%   median 85.7%   worst 96.3%
  boards where bonus is more than half of every word: 110 of 120

totalWords (the denominator now on the results card)
  min 6    p25 53    median 131    p75 244    max 639
  ratio max to min: 107x
```

What the results line I shipped actually says, for a player who solved
the whole required tier:

```
2026-07-01   "24 of 433 words"   =  6%
2026-07-02   "15 of 207 words"   =  7%
2026-07-03   "25 of 244 words"   = 10%
2026-07-04   "15 of 114 words"   = 13%
2026-07-05   "8 of 16 words"     = 50%
2026-07-06   "12 of 27 words"    = 44%

median, across 120 days: 14.5%
```

**A player who solves Polygram is currently told they found about a
seventh of it.** The board I happened to verify against yesterday had 28
total words, which is the bottom quartile — that is why this looked
survivable at the time.

## Problem 1: the tier closes behind you

`levelIndex` only ever increments (`reducer.ts`), `submit` validates only
against `currentLevel`, and clearing a level auto-advances 900ms later
with no player input. So **finding the last required word of a level
permanently locks that level's bonus words**, silently, on a timer.

The fastest route to "Solved" therefore produces the worst completion
number, and a player who wanted to sweep had to know to do it *before*
finishing each level — a rule the game never states.

## Problem 2: the denominator is an enumeration, not a checklist

This is the one that changes what the fix has to be.

The bonus tier is not a curated set of extra words. Dictionary v11 —
"full Scrabble coverage: every valid word of 3 to 10 letters is now
present; **the rest become bonus words**" — means the tier is *whatever
is left over* after the common-frequency cut. `enumerateWords(dict,
letters, size, "bonus")` returns every remaining Scrabble-legal string
the letters can spell.

That is a fine thing to reward when a player stumbles onto one. It is not
a thing anyone completes, and it was never designed to be a denominator.
Under a score it stayed invisible: unfound bonus words were points you
didn't get, and nobody knew how many. The moment it became `N of TOTAL`
it started making a promise the tier can't keep.

It also makes "Share of words" — the stats chart on the same PR —
compare boards whose word counts differ by 107x.

## Options

### 0. Count the required tier, mention bonus finds separately

```
Solved · 17 of 17 words · plus 6 bonus finds · Heptagon reached
```

The denominator becomes the thing the game actually asks for, and bonus
finds are additive with no ceiling implied — which is what they are.
Bonus words keep a reason to exist (the count goes up, and it is visible)
without pretending to a total.

- **Costs:** nothing. `Puzzle.totalWords` becomes required-only; the
  stats "Share of words" chart either goes or switches to the required
  denominator, where it is always 100% on a solved day and therefore
  pointless — so it goes.
- **Leaves problem 1 alive**, but drains it: if bonus finds have no
  denominator, missing some is not visibly failing at anything.
- This is the smallest honest change, and I would take it *today*
  regardless of which of the others is chosen — the current line is a
  live regression.

### 1. Keep every level open

Let a player submit words of any cleared level's size at any time.
Mechanically small (`submit` checks every level up to `levelIndex`), but
it changes what the board means — the polygon shows the current level,
and typing a 4-letter word at the heptagon has nowhere to land.

- **Buys:** problem 1 disappears completely.
- **Costs:** the board no longer says what you can type. Needs UI that
  does. This is a real redesign, not a patch.

### 2. Warn before the level closes

Replace the 900ms auto-advance with a beat that says what is about to
happen: "3 bonus words still here — advance anyway?" Only when bonus
words remain unfound, which on these numbers is nearly always.

- **Buys:** the door stops being invisible.
- **Costs:** a confirmation on every level of every game, which is five
  or six interruptions a day. Against a tier of 142 words the honest
  answer to "advance anyway?" is always yes, so it becomes a tax.
- Better as a one-time coach line than a repeated prompt.

### 3. Cap the bonus tier at generation

Keep only the best N bonus words per level (commonest, or shortest, or a
fixed 3–5), and make *that* the completable set. The tier stops being an
enumeration and becomes a designed checklist.

- **Buys:** a denominator that means something, on every board, with a
  stable range. Completion becomes genuinely achievable — and `swept`
  becomes a statistic instead of a curiosity.
- **Costs:** a generator change, so `DICT_VERSION` bumps and every
  in-flight save goes stale. Also: a word that is currently accepted
  would start being rejected, which is the one kind of change that makes
  a word game feel broken. Would need the tier to stay *accepted* while
  only the capped set *counts* — two concepts where there is one now.

### 4. Show the bonus tier's size, and let it be a long tail

Say the true number and let it be impressive rather than damning:
"17 of 17 required · 6 of 142 bonus found". Some players enjoy a bottomless
list.

- **Costs:** 6 of 142 still reads as failure to most people, and the
  ceiling is invisible until after the solve. This is option 0 with the
  discouragement added back.

## What I would do

**Option 0 now, as a hotfix**, because the shipped line is wrong on
typical boards today and every day it stays is a day players are told
they half-failed a puzzle they solved.

**Then option 3 if bonus words are meant to be a real completionist
target** — it is the only one that makes completion both achievable and
comparable across days, and it is the only one that makes `polygram:swept`
worth having collected. It needs the accept-versus-count split thought
through, and a `DICT_VERSION` bump timed so it does not collide with
in-flight saves.

**Option 1 only if the polygon UI gets rethought anyway.** It is the
purest answer to problem 1 and the most expensive.

I would not do option 2 alone: it warns about a door without making what
is behind it worth opening.

## Open question for you

Which is bonus words' actual job?

- *Texture* — a pleasant surprise when a rare word lands, never counted.
  Then option 0 is the whole fix and problem 1 does not need solving.
- *A second objective* — something a player can set out to complete.
  Then the tier has to be small enough to finish and open long enough to
  try, which is option 3, probably plus option 1.

The answer decides everything else, and it is a product call rather than
a code one.
