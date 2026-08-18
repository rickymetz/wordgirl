---
title: The dictionary
description: One shared word list with two levels and a version number.
---

Four of the five games use one shared dictionary. The code is in `src/lib/words/`. Serpentine uses poems, not words.

## Two levels

The file `dictionary.txt` contains words with 2 to 10 letters. The script `scripts/build-dictionary.mjs` makes this file. The words are in two levels:

- **Necessary words.** These are usual words. The generators make puzzles from them. The player must find them.
- **Bonus words.** These are unusual words. They have the prefix `+` in the file. The game accepts them and counts them. The player does not need them.

The function `parseDictionary(raw)` makes a `Dictionary` object. The object has the two levels, a combined index, and the function `has(word)`.

## Word masks

The dictionary puts the words in groups by length. Each word has a mask of 26 bits. Each bit shows one letter of the alphabet. The question "can these letters make this word?" becomes one AND operation. Thus the function `enumerateWords()` is fast. Polygram uses it for each level.

## The load

The function `loadDictionary()` is in `src/lib/words/loader.ts`. It gets `dictionary.txt` one time. It keeps the result for all callers. The service worker has the file in its cache. Thus the dictionary is available without a connection. After a failed load, the function permits a new try.

## DICT_VERSION

`DICT_VERSION` connects the saved days to their puzzles. The number is 19 at this time. Refer to [How daily puzzles work](/docs/games/daily-puzzles/) and [Data storage and streaks](/docs/architecture/persistence/).

This is the rule: increase the number for each change to the puzzle calculation. Examples are a word list change, a generator change, and a seed change. If you do not increase the number, the saves do not agree with the puzzles. This defect is not easy to see.

Since all five games share one `DICT_VERSION`, a bump for one game formerly invalidated every other game's saves — even when those puzzles had not changed. Each game now computes a `puzzleKey` (a deterministic fingerprint of the puzzle's identity data) and stores it in each save. When both a save and the current puzzle carry a `puzzleKey`, the comparison uses those instead of `DICT_VERSION`. Legacy saves without a `puzzleKey` still fall back to the version number. This means a Doublet-only generator change no longer wipes a Crosshatch player's progress. Refer to [Data storage and streaks](/docs/architecture/persistence/) for the full mechanism.

### The version history

The rule is not abstract — the source file records every bump and its reason. The history doubles as the engineering diary of the games:

| Version | Change |
|---------|--------|
| v2 | Two tiers: common REQUIRED words gate advancement; rarer BONUS words are optional finds. |
| v3 | Puzzle staples (ode, …) enter the required tier whatever their frequency; mild words leave the blocklist. |
| v4 | The Crosshatch generator never fully locks a line. Generator behavior counts as derivation, not only word lists. |
| v5 | Crosshatch progress counts distinct words, not full frames. The band and the save shape changed with it. |
| v6 | Buckets keep frequency order; Polygram sorts its own display lists. |
| v7 | Subtitle name-junk blocked; everyday concrete words added; a cap on one Crosshatch line's share of a day. |
| v8 | Mirror-word staples (dab) enter the required tier, so pairs like bad and dab play in Pierglass. |
| v9 | Junk reversals and name-palindromes (tae, nam, deb, …) blocked — Pierglass must not teach non-words. |
| v10 | Pierglass palindrome prefix aliases: shadowed even palindromes (poop, peep) join the pool. |
| v11 | Full Scrabble coverage: every valid word of 3 to 10 letters is now present; the rest become bonus words. |
| v13 | doze, ooze, skied, misdeed, missive move to the required tier — players expect them. |
| v14 | Crosshatch accepts bonus words; Polygram removes its per-level bonus cap. |
| v15 | The 20-cell hard Doublet boards leave — their uniqueness verification froze mobile browsers. |
| v16 | The Doublet e5 board becomes a staircase. The old T-bar had checkerboard colors 4/2 — no domino tiling existed, and every attempt that drew it failed. |
| v17 | Crosshatch generates from the required tier only, so no day demands a rare word. |
| v18 | Pierglass gets a bigger vocabulary and a target worth missing. |
| v19 | Serpentine paths never cross themselves, so every board is re-laid. |
