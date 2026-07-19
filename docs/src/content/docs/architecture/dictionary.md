---
title: The dictionary
description: Two tiers, letter bitmasks, and the DICT_VERSION discipline.
---

Four of the five games validate against a single shared dictionary
(`src/lib/words/`). Serpentine is the exception — it ships poetry, not
words.

## Two tiers

The source file `dictionary.txt` (built by `scripts/build-dictionary.mjs`)
holds words of 2–10 letters in two tiers:

- **required** — common words; what generators build puzzles from and what
  players are expected to find.
- **bonus** — rarer words, prefixed `+` in the file; accepted and scored,
  never required.

`parseDictionary(raw)` produces a `Dictionary` with `required`, `bonus`,
and a combined `all` index, plus a `has(word)` membership test.

## Length buckets and letter bitmasks

Each tier is bucketed by word length, and every word gets a precomputed
26-bit **letter mask** (bit *i* set if letter *i* appears). Subset tests —
"is this word spellable from these letters?" — are a single AND against the
pool's mask, which is what makes Polygram's per-level enumeration
(`enumerateWords(dict, letters, size, tier)`) a linear scan with O(1) per
word.

## Loading

`loadDictionary()` (`src/lib/words/loader.ts`) lazily fetches
`dictionary.txt` and memoizes a module-singleton promise, suitable for
React's `use()`. The file is in the service-worker precache (the `.txt`
glob in `vite.config.ts`), so it's available offline; a failed load clears
the memo so retry works.

## DICT_VERSION

`DICT_VERSION` (currently **15**) is the compatibility stamp between saved
days and the puzzles they belong to — see
[How daily puzzles work](/games/daily-puzzles/) for the player-facing story
and [Persistence](/architecture/persistence/) for the save guards.

The discipline, per the changelog comment in `dictionary.ts`: bump it for
**any change to puzzle derivation** — wordlist edits, generator logic,
seed handling — not just dictionary content. An un-bumped derivation change
is the worst kind of bug: saves silently mismatch the puzzles they claim to
describe.
