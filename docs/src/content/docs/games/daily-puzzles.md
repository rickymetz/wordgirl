---
title: How daily puzzles work
description: Nobody sends you the puzzle. Your device and every other device invent the same one, from nothing but the date.
---

Nobody sends you today's puzzle. At midnight, your device and every other device invent the exact same one, from nothing but the date. WordGirl has no puzzle server. There is nothing to phone home to — the game cannot send your puzzle history anywhere, because no such place exists. This page tells you how that works.

## The seed

Each generator is a function of two inputs. The inputs are the dictionary and a seed text. The seed text contains the game name, a version number, and the local date. This is a real seed — you can see today's date inside it:

```
polygram:v1:daily:2026-07-19
backwords:v2:daily:2026-07-19
serpentine:v2:daily:haiku:2026-07-19
```

The seed goes into a random number generator (xmur3 and mulberry32, in `src/lib/random.ts`). The same seed always gives the same numbers, on every device. The generator uses these numbers for every decision: which word starts the puzzle, which shape holds the frame, which cell starts the path. Same date, same decisions, same puzzle — with no connection at all.

## The price of the trick

The design trades one discipline for the server it does not have:

- **The order of the random numbers is frozen.** If a code change moves one random call, all the old puzzles change silently. Such a change must also change the version number in the seed, which changes every day's puzzle at one time, deliberately.
- **Shared data lists are frozen.** The seed points into the Crosshatch shape list and the Serpentine poem list. You can add items to the end of a list. You cannot change the order of a list.
- **The version stamp is forever.** Each change to the puzzle calculation must increase a version number, so saved days and puzzles never disagree.

In exchange: no server costs, no accounts, full offline play, and a puzzle that is the same for everyone by mathematical necessity, not by promise.

## Make and examine

All five generators operate in the same pattern. The generator makes a random puzzle quickly. Then it examines the puzzle against quality limits. If the puzzle is not correct, the generator starts again. Each generator has a maximum number of tries.

| Game | Method | Quality limits | Maximums |
|------|--------------|---------------|--------------|
| Polygram | letter growth | 5 levels or more, 35 words maximum, word limits for each level | 300 tries |
| Crosshatch | slot fill and letter adds | 10 to 22 words, 1 single-word slot maximum | 300 tries |
| Backwords | random letter set | 2 solutions or more, 2 row counts or more | 400 tries |
| Doublet | word fill and domino cut | only one solution | 200 tries, 500 ms |
| Serpentine | Warnsdorff path | path through all cells | 200 tries, then a constructed path |

Two games have a guaranteed alternative for a bad seed: Doublet ships its best unverified puzzle, and Serpentine constructs a row-by-row path. The other three games stop with an error if all the tries fail. Their attempt caps are validated instead: generator tests sweep many seeds and make sure that the limits hold with a wide margin. Backwords, for example, measured 0 failures with a maximum of 26 tries over 90 daily puzzles — against a cap of 400.

## Version numbers

Four games use the dictionary. These games write `DICT_VERSION` into each puzzle and each saved day. The number is 15 at this time (`src/lib/words/dictionary.ts`). The number increases when the puzzle calculation changes. Examples are a word list change, a generator change, or a score change. An old saved day does not agree with a new puzzle. The version number finds this condition. The [dictionary page](/docs/architecture/dictionary/) shows the full version history — thirteen recorded changes, each with its reason. Serpentine has no dictionary. Its version number is in the seed text.

## The solution is in the puzzle

Each generator gives the puzzle together with its solution data. Examples are the Crosshatch word sets, the Backwords solution counts, and the Serpentine path. Thus the answer check is fast when you play — the expensive search occurs one time, before you start. The game makes the solution again from the seed. The game does not keep the solution in storage.
