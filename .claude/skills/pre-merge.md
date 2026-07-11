---
description: Run the pre-merge checklist for a game feature branch
user_invocable: true
---

# Pre-merge Checklist

Run the full pre-merge checklist for a WordGirl game feature branch.
Fail fast on build/test errors, then audit the diff for house patterns.

## Step 1 — Build & test gate

Run these two commands. If either fails, stop immediately and report
the failure with the relevant output. Do not continue to Step 2.

```
npx vitest run
npm run build
```

## Step 2 — Diff audit

Collect the diff with `git diff main...HEAD`. Identify which game(s)
are touched (files under `src/games/<id>/`). Run each check below
against the diff. Report every item as **PASS**, **FAIL**, or
**SKIP** (skip when the pattern is irrelevant to the changed files).

### Persistence patterns

- [ ] **Hydration timing** — `hydrated.current = true` is set INSIDE
      the async callback, after the await — not before it.
- [ ] **Clock hook** — game hooks use `useDailyClock`, not inline
      `setInterval` or `visibilitychange` listeners. Grep the changed
      game directories for these; matches are a FAIL.
- [ ] **resetKey completeness** — the `resetKey` passed to
      `useDailyClock` includes every relevant key (difficulty, dateKey,
      mode, etc.). Cross-check with the state that triggers a new
      session.
- [ ] **Save-before-stats** — `updateStats` is called only after
      `saveDailyProgress` has completed (awaited or chained). It must
      not fire-and-forget before the save.
- [ ] **Stale-progress fallback** — `loadStaleDailyProgress` exists
      and prevents a played game from being double-counted when
      `DICT_VERSION` bumps.
- [ ] **Abandon on replay** — `abandonSession()` is called before any
      replay/reset clears state.

### UI patterns

- [ ] **SVG overlay aspect** — any SVG overlays use
      `preserveAspectRatio="xMidYMid meet"`.
- [ ] **Board scaling** — board dimensions multiply px constants by
      `rem / 16` from `useViewport`.
- [ ] **Pointer default prevention** — game-surface buttons include
      `onPointerDown={(e) => e.preventDefault()}`.
- [ ] **Share gating** — `ShareButton` is rendered only when a
      `dateKey` is present (no practice-mode shares).
- [ ] **Replay confirmation** — replay triggers a confirmation dialog,
      not an instant reset.
- [ ] **Archive separators** — archive rows use `·` (middle dot),
      not `.` (period).
- [ ] **No emoji in chrome** — emoji appear only inside share strings,
      never in UI labels or buttons.

### Test coverage

- [ ] **Engine tests** — an `engine/*.test.ts` file exists for the
      touched game.
- [ ] **Reducer tests** — a `state/reducer.test.ts` file exists for
      the touched game.
- [ ] **Persistence tests** — a `state/persistence.dom.test.ts` file
      exists for the touched game.

## Step 3 — Summary

Print every check with its PASS/FAIL/SKIP verdict in a table.

- If ALL checks pass (or skip): **"Ready to merge."**
- If ANY check fails: list each failure with a one-line explanation of
  what to fix, then say **"Not ready to merge — fix the items above."**
