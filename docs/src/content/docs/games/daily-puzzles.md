---
title: How daily puzzles work
description: Seeded determinism, quality gates, and version stamps — how every player gets the same puzzle with no server.
---

WordGirl has no puzzle server. Every player's device generates the day's
puzzles locally — and everyone gets exactly the same ones. This page explains
the machinery shared by all five games.

## Seeded determinism

Every generator is a **pure function of `(dictionary, seed string)`**. The
seed is built from the local date, namespaced and versioned per game:

```
polygram:v1:daily:2026-07-19
backwords:v2:daily:2026-07-19
serpentine:v2:daily:haiku:2026-07-19
```

The PRNG (`src/lib/random.ts`) is an **xmur3** string hash feeding
**mulberry32** — a small, fast 32-bit generator producing floats in `[0, 1)`
— plus a deterministic Fisher–Yates `shuffle`. Same seed, same puzzle, on
any device, offline.

Two consequences the codebase treats as law:

- **PRNG consumption order is frozen.** Reordering two `rand()` calls in a
  generator silently reshuffles every historical puzzle. Any such change
  must ride a seed-version bump (`v1` → `v2`), which changes every day's
  puzzle at once, deliberately.
- **Shared data is frozen too.** Crosshatch's shape library and Serpentine's
  poetry pools are indexed by seed — appending is safe, reordering is not.

## Generate-and-test with an authored aesthetic band

All five generators follow the same shape: **cheap randomized construction,
then hard quality gates, retried under explicit caps.**

| Game | Construction | Quality gates | Cap / budget |
|------|--------------|---------------|--------------|
| Polygram | greedy letter growth | reaches ≥ pentagon, ≤ 35 words, per-level bands | 300 attempts |
| Crosshatch | MRV backtracking fill + given tightening | 10–22 distinct words, ≤ 1 locked slot, no dominant slot | 300 attempts |
| Backwords | random bank assembly | ≥ 2 decompositions with ≥ 2 distinct row counts | 400 attempts |
| Doublet | CSP fill + random perfect matching | provably unique letter grid | 200 attempts, 500 ms deadline, node budgets |
| Serpentine | Warnsdorff path walk | full coverage (else restart) | 200 attempts + boustrophedon fallback |

Every game also has a graceful floor — a fallback candidate, a relaxed
retry, or a constructive algorithm — so a pathological seed can never hang
or crash the main thread. Generation runs on-device within mobile
performance budgets.

## Version stamps

The four dictionary games stamp `DICT_VERSION` (currently **15**, defined in
`src/lib/words/dictionary.ts`) into every generated puzzle and saved day.
It's bumped whenever *puzzle derivation* changes — a wordlist edit, a
generator tweak, a scoring rule — not just dictionary content. Persistence
uses it to recognize stale saves: yesterday's half-finished day generated
under version 14 won't be replayed against a version-15 puzzle it no longer
matches. Serpentine, having no dictionary, versions through its seed string
instead.

## Ship the solution, validate for free

A recurring trick: the generator ships the puzzle **already solved or fully
enumerated** — Crosshatch's complete combo list, Backwords' solution
metadata, Doublet's placement solution, Serpentine's path. Play-time
validation is then trivial (set lookups and arithmetic), which is what makes
instant, offline feedback possible on low-end phones. Solutions are
regenerated from the seed on load, never persisted.
