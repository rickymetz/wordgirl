# WordGirl

A little collection of games, made with love. Mobile-first, offline-capable
PWA — install it on a phone and play anywhere.

## Games

### Polygram

Inspired by NYT Spelling Bee, with escalating polygon levels:

- Start with **3 letters in triangles** flocking around a central triangle.
- Tap the outer shapes to build a word; tap the **central shape** to submit.
- At level N, valid words are **exactly N letters long**, built from the N
  available letters — **letters can repeat** (with A,B,C, "ABA" counts).
- Find **all** the words at a level and a new letter joins the flock: the
  shapes morph into the next polygon (triangle → square → pentagon → …).
- The puzzle ends at the last polygon that still has a valid word — if no
  10-letter word exists, the decagon never appears.
- The word list shows blanks for unfound words **in alphabetical order**
  — where a blank sits between found words is itself a gentle hint. (A
  letter-reveal hint system exists in the engine but is hidden for now.)
- Points per word + rank titles: Beginner → Good → Great → Amazing →
  Genius → **Polygon**.
- One **daily puzzle** (same for everyone, deterministic from the date)
  plus unlimited **practice** puzzles.

### Crosshatch

A small crossword frame with many right answers:

- **3–5 intersecting lines**, each locked to a few given letters. Type
  freely into the rest.
- Fill every line with a valid word (crossings agree, no repeats) and
  submit — every **new word** in a valid grid counts. Change lines and
  keep hunting.
- The daily generator enumerates **every** valid filling and accepts
  days with 10–22 distinct words (no single line hoarding more than 8)
  — ranks are the percentage of words found: Beginner → … → Genius →
  **Weaver**.
- Finding **most of the words solves the day** (~90%, always with a
  couple words of slack); 100% is the perfect sweep.
- Chips under the grid judge each line's current word: ❌ doesn't work
  there, grey ✓ counted already, ✅ a new word.
- The words panel lists the whole day as **?-blanks** (like Polygram);
  blanks are tappable to aim **hints**, which reveal random letters —
  the first daily hint warns that the share text will carry a 🫣 count.
- Daily + practice + a replayable archive, same as Polygram.

## Development

```bash
npm install
npm run dev        # dev server
npm test           # vitest suite (engine, generator, storage, reducer)
npm run build      # typecheck + production build + service worker
npm run preview    # serve the production build locally
```

### Architecture

- **Single Vite app** — React + TypeScript + Tailwind v4. Each game is a
  folder under `src/games/<id>/` and a one-line entry in
  `src/games/registry.ts`; routes and hub cards are generated from the
  registry, and each game is a lazy code-split chunk.
- **Game engines are pure TS** (`src/games/polygram/engine/`) — no React,
  no DOM — so they're unit-testable and portable (Capacitor later).
- **Storage** goes through an async `StorageAdapter`
  (`src/lib/storage/`), localStorage-backed today. The `profileId`
  namespace segment is the seam for adding auth/cloud sync later without
  touching game code.
- **Daily puzzles** are generated client-side from a seeded PRNG
  (`polygram:v1:daily:<local date>`), so everyone gets the same puzzle
  with zero backend. Determinism depends on the committed dictionary —
  regenerating `dictionary.txt` (`npm run build:dictionary`) changes
  future dailies; bump `DICT_VERSION` in `engine/dictionary.ts` if you do.
- **Two-tier dictionary** — `dictionary.txt` holds *required* words
  (common: top-12k by frequency) plus *bonus* words (rarer: 12k–30k,
  prefixed with `+`). Required words gate level clears and receive
  hints; bonus words only add points. Saves from an older
  `DICT_VERSION` are kept as historical archive records, and that day
  restarts fresh when replayed.

### PWA / iOS

- Installed via Safari: **Share → Add to Home Screen** (iOS has no
  install prompt).
- Fully offline after first load — the service worker precaches the app
  and dictionary.
- Note: iOS may evict localStorage for PWAs unused for weeks; cloud sync
  is the eventual fix (seam already in place).

### Deploying

Pushes to `main` deploy via Netlify (`netlify.toml`: build `npm run
build`, publish `dist/`, SPA redirect included).
