# Serpentine & Project-Wide Review

Multi-persona audit of the Serpentine game, cross-game consistency, build
tooling, and project health. Findings are ordered by severity within each
section. Line references are as of the review date.

---

## Serpentine Bugs

### CRITICAL: Hydration race clobbers unsolved in-progress saves

`state/useSerpentineGame.ts:55-58` — `hydrated.current` is set to `true`
**synchronously** before the async `loadDailyProgress` resolves. The
save-on-state-change effect (line 100-103) sees the flag as true and
immediately writes the empty initial state to storage, overwriting any
unsolved in-progress save. The shared persistence layer only guards
**solved** saves from being overwritten by unsolved ones — unsolved
progress is silently destroyed.

Every sibling game sets `hydrated.current = true` **inside** the async
callback, after the load completes. Pierglass even has a comment:
*"hydratedRef flips only AFTER hydration completes."*

**Scenario:** Player places cells without solving, closes tab. On reopen,
empty state overwrites saved progress before load completes. Player sees a
fresh board.

### HIGH: SVG `preserveAspectRatio="none"` distorts path nodes

`ui/SnakeGrid.tsx:115` — The SVG overlay uses
`preserveAspectRatio="none"`, which stretches `<circle>` elements into
ellipses on non-square grids (the common case). A 5x8 grid renders ovals
instead of circles for path nodes.

### HIGH: Clock `resetKey` missing difficulty

`state/useSerpentineGame.ts:47` — `resetKey` is only `dateKey`, not
`${difficulty}:${dateKey}`. If the component doesn't fully unmount when
switching difficulty on the same date, accumulated active time from the
previous difficulty carries into the new one.

**Fix:** `resetKey: \`${difficulty}:${dateKey}\``

### HIGH: `pickBlocked` doesn't guarantee grid connectivity

`engine/puzzles.ts:37-78` — Cells are removed from corners/edges/interior
to reach a target count, but there's no check that remaining live cells
form a connected graph. Disconnected components make Hamiltonian path
search impossible. The boustrophedon fallback (line 163-181) has the same
structural weakness — row-to-row transitions can fail when blocked cells
create column gaps > 1. Both paths terminate with an uncaught `Error`.

### MEDIUM: Wrong separator in archive `rowStatus`

`ui/ArchivePage.tsx:45,47` — Uses plain `.` instead of middle dot `·`
(`·`). Every other game uses `·`.

### MEDIUM: Share button shown in practice mode

`ui/Overlays.tsx:94` — `ShareButton` renders unconditionally. Other games
gate on `dateKey` presence or `mode.kind !== "practice"`. Practice shares
produce odd text with no date.

### MEDIUM: Missing `validShape` guard in `loadAllDailyProgress`

`state/persistence.ts:79-83` — Reads raw saves with only a weak
`typeof saved === "object" && saved.dateKey` check instead of using the
`validShape` function from `createDailyPersistence` that every other game
uses. Corrupted saves could slip through.

### MEDIUM: `getPuzzle`/`getPuzzlePool` accept `string` instead of `Difficulty`

`engine/puzzles.ts:672,683` — Both functions take `difficulty: string`
rather than `Difficulty`. Invalid values like `"easy"` silently fall back
to haiku via `TYPE_OFFSET[difficulty] ?? 0`. The `as Difficulty` cast is a
no-op at runtime.

### MEDIUM: Stale dictionary check uses `<` instead of `!==`

`state/persistence.ts:91` — Uses `(s.dictVersion ?? 0) < DICT_VERSION`
while every other game uses `!==`. Misses saves from a future dictionary
version (edge case but inconsistent).

### MEDIUM: Stats double-counting on crash

`state/useSerpentineGame.ts:106-135` — The in-memory `statsRecorded` flag
is set before two independent async writes: `saveDailyProgress` (which
persists `statsRecorded: true`) and `updateStats`. If the browser crashes
after `updateStats` completes but before the save writes, the next session
hydrates with `statsRecorded: false` and double-counts.

### MEDIUM: Board doesn't use `useViewport` for height budgeting

`ui/SnakeGrid.tsx:96-105` — Uses a fixed `maxWidth` of `cols * 44px`
without scaling by `rem/16` for the Text-size setting or using
`useViewport`'s safe-area-adjusted `vh`. Can overflow on large text or
notched phones.

### MEDIUM: `SnakeText` fixed `h-12` clips long phrases

`ui/SnakeText.tsx:26` — Container is fixed at 48px. Poem-difficulty
puzzles with 40+ letters can overflow at larger text sizes.

### MEDIUM: Pointer events don't call `preventDefault` on grid

`ui/SnakeGrid.tsx:53-66` — `onPointerDown` calls `setPointerCapture` but
not `e.preventDefault()`. Desktop browsers may show text selection
highlights during drag.

### LOW: Status hub card shows emoji in UI chrome

`ui/SerpentineStatus.tsx:15` — `"Solved ✓"` uses a check mark character.
CLAUDE.md reserves emoji for share strings only.

### LOW: Status short-circuits on first solved difficulty

`ui/SerpentineStatus.tsx:13-16` — Returns `"Solved ✓"` as soon as *any*
difficulty is solved, unlike doublet which reports partial progress
(`"1/3 solved"`). Should show `"Haiku solved"` or `"1/2 solved"`.

### LOW: Missing replay confirmation dialog

`ui/Overlays.tsx:106-115` — Replay fires immediately. Every other game
shows a confirmation warning that replay replaces the saved result.

### LOW: Coach sheet doesn't mention the Hint feature

`ui/Overlays.tsx:128-183` — The how-to-play sheet explains path tracing
but never mentions the Hint toggle that highlights word-start cells.

### LOW: Unused `targetLen` prop in SnakeGrid

`ui/SnakeGrid.tsx:8` — Declared in `Props` interface, passed by
`GameScreen`, but never used inside the component.

### LOW: `getAuthorForDay` ignores difficulty (dead code)

`engine/puzzles.ts:694-696` — Always returns the haiku author regardless
of difficulty. Currently has no callers, so no runtime impact.

### LOW: Missing `hours` histogram in TrendsPage

Every other game includes a "When you solve" hour-of-day histogram.
Serpentine lacks the `solvedHour` field in `DayProgress` needed to support
this.

### LOW: `played` double-counted on dictionary version bump

`state/useSerpentineGame.ts:71-73` — When a stale save is discarded on
dict version bump, `recordStarted()` fires again. Sibling games use a
stale-record fallback to detect and skip this case.

---

## Project-Wide Findings

### HIGH: No CI pipeline

No `.github/workflows/` directory exists. The CLAUDE.md rule that `vitest
run` and `npm run build` must pass before any commit is entirely
honor-system. A broken build can reach production with no gate.

### HIGH: No pre-commit hooks

No husky, lint-staged, or lefthook configuration. Combined with no CI,
there is zero automated enforcement of the CLAUDE.md quality rules.

### HIGH: Polygram persistence not migrated to shared recipe

CLAUDE.md explicitly notes this: *"polygram predates the recipe — migrate
it when next touched."* Polygram reimplements ~235 lines of persistence
logic (`statsLock`, `validShape`, `saveDailyProgress` multi-tab guard,
`displayStreak`) that the shared `createDailyPersistence` provides. Uses
`completed`/`lastCompletedDate` instead of `solved`/`lastSolvedDate`.

### HIGH: Three games still duplicate active-time clock

Only pierglass and serpentine use the shared `useDailyClock`. Polygram,
crosshatch, and doublet each inline ~30 lines of identical
visibility/pagehide/bank/flush logic.

### MEDIUM: No linter or formatter

No ESLint or Prettier configuration. TypeScript strict mode catches some
issues but runtime quality checks are absent.

### MEDIUM: Serpentine missing reducer + persistence tests

Test inventory shows serpentine has only `engine/puzzles.test.ts`. Missing
`state/reducer.test.ts` and `state/persistence.dom.test.ts` that every
other game has.

### MEDIUM: Polygram missing persistence tests

The oldest game and only one without `persistence.dom.test.ts`.

### MEDIUM: Doublet missing aria-live region

CLAUDE.md requires mirroring toast text into an `aria-live` region.
Doublet has zero `aria-live` regions and doesn't use `GameToast`/`useToast`.

### MEDIUM: Main bundle is 462 KB with no chunk splitting

All of React, react-dom, motion, and lucide-react in one chunk. For a
precaching PWA the initial download is one-time, but service worker
updates re-download the full chunk for any app change. A `manualChunks`
config would improve cache stability.

### LOW: Missing `scripts/validate_palette.js`

CLAUDE.md references this script for chart color validation but it doesn't
exist. The mandate is unenforceable.

### LOW: Unused exports in shared libraries

`lib/random.ts`: `xmur3`, `mulberry32` (only used internally).
`lib/words/dictionary.ts`: `MIN_WORD_LEN`, `MAX_WORD_LEN`, `Tier`.
`lib/swUpdate.ts`: `UpdateCheckResult`. `lib/settings.ts`:
`DEFAULT_SETTINGS`. Could be unexported.

### LOW: PWA manifest theme_color always white

`vite.config.ts` sets `background_color` and `theme_color` to `#ffffff`.
Dark-mode users see a white splash screen on Android.

### LOW: No Node version constraint

No `engines` field in `package.json`, no `.nvmrc`. ES2022+ features and
`node:` protocol imports silently fail on older Node versions.
