---
description: Run a structured multi-dimension review of a game
user_invocable: true
arguments:
  - name: id
    description: "Game ID to review (e.g. serpentine, crosshatch)"
    required: true
---

# Game Review

Review the game `$id` against the project's house rules and proven patterns.

## Setup

1. Read every file under `src/games/$id/` — engine, state, UI, tests.
2. Also read `src/lib/daily/persistence.ts`, `src/lib/daily/useDailyClock.ts`,
   and `src/components/game/` for reference implementations.

## Dimensions to check

Work through each dimension below. For every finding, verify it is real
by reading the relevant code — do not report false positives.

### 1. Persistence & state integrity

- Hydration sets `hydrated.current` inside the async callback, not before it.
- Stale-save fallback fires before `recordStarted()`.
- `updateStats` chains after `saveDailyProgress` (not before or in parallel).
- Clock uses `useDailyClock` from `lib/daily/useDailyClock.ts`, not an inline
  timer.
- Clock `resetKey` includes all keys that should trigger a timer restart.
- `abandonSession()` is called before replay resets.
- `statsRecorded` replay marker prevents double-counting.
- Multi-tab guard: `allowUnsolvedWrite` is passed to `saveDailyProgress`.

### 2. Accessibility & interaction

- Game surfaces have `touch-manipulation` and `select-none`.
- Game-surface pointer handlers call `e.preventDefault()` to prevent focus
  theft.
- All touch targets are at least 44 px (via sizing, `::after` expansion, or
  negative-margin padding).
- Dialogs use `useModalFocus`; initial focus marked with `data-autofocus`.
- Toast feedback is mirrored into an `aria-live` region.
- Keyboard navigation works for core game actions.

### 3. Visual consistency

- Every color references a `light-dark()` token from `src/index.css` — no
  hardcoded hex values in components.
- Game surfaces are scoped with `data-level={accentLevel}`.
- Tinted panels use `bg-surface-tint`; elements on tint use `bg-surface`,
  never `bg-tile`.
- Archive page renders the shared `GameArchive` component, not a hand-rolled
  layout.
- No emoji in UI chrome (emoji are allowed only in share strings).

### 4. Layout & responsiveness

- No page-level scroll when content fits (game uses `grow`, not `min-h-dvh`).
- Board dimensions scale by `rem / 16` via `useViewport`.
- SVG overlays use `preserveAspectRatio="xMidYMid meet"`.
- Layout works at both default and Huge text sizes (check that nothing
  overflows or collapses).

### 5. Share & results

- `ShareButton` is gated on `dateKey` so practice mode cannot share.
- Share string ends with `SHARE_URL`.
- Results screen displays the frozen clock time.
- Replay triggers a confirmation dialog before resetting.
- Archive stat separators use `·` (middle dot), not `.` (period).

### 6. Test coverage

- Engine tests exist under the game folder or a `__tests__` subfolder.
- Reducer / state-hook tests exist.
- Persistence or DOM integration tests exist.
- Total test count is reasonable given the game's complexity.

## Output format

Report findings as a structured list grouped by dimension:

```
### <Dimension>

- **[severity]** `file:line` — Description of finding.
  Fix: Specific code change to resolve it.
```

Severity levels:
- **high** — Correctness bug, data loss risk, or accessibility barrier.
- **medium** — Deviation from house rules that could cause visual or UX
  inconsistency.
- **low** — Minor style nit or missing-but-non-critical pattern.

If a dimension has no findings, report it as clean:

```
### <Dimension>
No issues found.
```

End with a summary: total finding count by severity and an overall
assessment of the game's adherence to project standards.
