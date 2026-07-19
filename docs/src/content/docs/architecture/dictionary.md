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

`DICT_VERSION` connects the saved days to their puzzles. The number is 15 at this time. Refer to [How daily puzzles work](/docs/games/daily-puzzles/) and [Data storage and streaks](/docs/architecture/persistence/).

This is the rule: increase the number for each change to the puzzle calculation. Examples are a word list change, a generator change, and a seed change. If you do not increase the number, the saves do not agree with the puzzles. This defect is not easy to see.
