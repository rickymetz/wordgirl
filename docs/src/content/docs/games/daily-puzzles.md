---
title: How daily puzzles work
description: Each device makes the same puzzle each day. This page tells you how.
---

WordGirl has no puzzle server. Your device makes the puzzles for the day. Each device makes the same puzzles. This page tells you about the parts that all five games use.

## The seed

Each generator is a function of two inputs. The inputs are the dictionary and a seed text. The seed text contains the game name, a version number, and the local date. These are examples:

```
polygram:v1:daily:2026-07-19
backwords:v2:daily:2026-07-19
serpentine:v2:daily:haiku:2026-07-19
```

The seed goes into a random number generator. The generator is xmur3 and mulberry32 (`src/lib/random.ts`). The same seed always gives the same numbers. Thus the same date gives the same puzzle on each device. No connection is necessary.

Two rules apply to all the games:

- The order of the random numbers is frozen. If a code change moves one random call, all the old puzzles change. Such a change must also change the version number in the seed.
- Shared data lists are frozen. The seed points into the Crosshatch shape list and the Serpentine poem list. You can add items to the end of a list. You cannot change the order of a list.

## Make and examine

All five generators operate in the same pattern. The generator makes a random puzzle quickly. Then it examines the puzzle against quality limits. If the puzzle is not correct, the generator starts again. Each generator has a maximum number of tries.

| Game | Method | Quality limits | Maximums |
|------|--------------|---------------|--------------|
| Polygram | letter growth | 5 levels or more, 35 words maximum, word limits for each level | 300 tries |
| Crosshatch | slot fill and letter adds | 10 to 22 words, 1 closed slot maximum | 300 tries |
| Backwords | random letter set | 2 solutions or more, 2 row counts or more | 400 tries |
| Doublet | word fill and domino cut | only one solution | 200 tries, 500 ms |
| Serpentine | Warnsdorff path | path through all cells | 200 tries, then a simple path |

Each game also has a safe alternative for a bad seed. Thus the game cannot stop or become slow.

## Version numbers

Four games use the dictionary. These games write `DICT_VERSION` into each puzzle and each saved day. The number is 15 at this time (`src/lib/words/dictionary.ts`). The number increases when the puzzle calculation changes. Examples are a word list change, a generator change, or a score change. An old saved day does not agree with a new puzzle. The version number finds this condition. Serpentine has no dictionary. Its version number is in the seed text.

## The solution is in the puzzle

Each generator gives the puzzle together with its solution data. Examples are the Crosshatch word sets, the Backwords solution counts, and the Serpentine path. Thus the answer check is fast when you play. The game makes the solution again from the seed. The game does not keep the solution in storage.
