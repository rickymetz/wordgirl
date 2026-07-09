# WordGirl — house rules

Mobile-first, offline-capable PWA game hub. One Vite app; each game is
a folder under `src/games/<id>/` plus one entry in
`src/games/registry.ts`. Engines are pure TS (`engine/`), state hooks
in `state/`, React in `ui/`. See README for architecture.

## Style rules (apply to every new game)

**Color**
- Every color is a `light-dark()` token in `src/index.css`. Never
  hardcode a hex in a component — read tokens (`--level-N`,
  `--color-*`) via Tailwind utilities or `var()`.
- Each game owns ONE palette key, set as `GameDefinition.accentLevel`
  (a Polygram level number or the game's own key, e.g. `"crosshatch"`).
  Scope every game surface — game screen, archive, practice — with
  `data-level={accentLevel}` so `bg-accent`/`text-accent` resolve to
  the game's color. The root purple belongs to the hub/settings only.
- Light-mode accents are ~700-weight shades: accent text on surface
  AND surface text on accent must clear WCAG AA (4.5:1).
- Tinted panels use `bg-surface-tint` (6% accent light / 13% dark).
  Elements ON a tinted panel punch out with `bg-surface` — never
  `bg-tile`, which is a warm grey tuned for plain surfaces and reads
  as a stain on tint.

**Copy & iconography**
- Neutral, descriptive labels. No flavor text, no bylines, no jargon
  ("banked"). Rank/coach headlines are plain ("Clear the level", not
  "Grow the flock").
- lucide-react icons only in UI chrome — emoji are allowed ONLY inside
  share strings. Share strings end with `SHARE_URL` (`src/lib/share.ts`).
- Blanks are monospaced `?` in `font-game` (Rubik Mono One) wherever a
  hidden letter appears — chips, word lists, typed-word tray — so
  nothing reflows as letters fill in.

**Layout & interaction**
- No game screen may have a page scroll when content fits. `#root` is
  exactly 100dvh with safe-area padding inside it; pages use `grow`,
  never `min-h-dvh`. Board height budgets must scale with the root
  font-size — use `src/lib/useViewport.ts` (`vh` excludes safe-area
  insets; `rem` is the Text-size setting).
- Touch targets ≥ ~44px (invisible `::after` expansion or negative-
  margin padding is fine). `touch-manipulation` + `select-none` on
  game surfaces; `onPointerDown={(e) => e.preventDefault()}` on
  game-surface buttons so taps never steal focus from the grid.
- Sheets (settings, how-to-play) use `components/BottomSheet` /
  `CoachSheet` inside `<AnimatePresence>`. Centered confirmations use
  `components/ModalDialog`. All dialogs get focus containment via
  `useModalFocus`; mark the intended initial focus with
  `data-autofocus` (the container itself for results cards).
- Any puzzle input closes an open words panel; window-level Enter/Space
  handlers must defer to a focused control (`target.closest("button…")`).

**Archive pages (auto-generated)**
- NEVER hand-roll an archive page. Render
  `components/GameArchive.tsx` with a `GameArchiveConfig`: gameId,
  accent (= accentLevel), epoch, the two loaders, `hasPlayed`, six
  `statTiles`, `isDone`, and `rowStatus`. The shared component owns
  ALL archive layout/colors (stats grid + calendar mosaic on tinted
  panels, neutral not-played cells, scoreboard rows). ~30 lines of
  config per game — see either game's `ui/ArchivePage.tsx`.
- Persistence follows the same shape both games use: day saves keyed
  `daily:<dateKey>` with `dictVersion`, stats blob with defaults-merge
  on load, `displayStreak()` for anything that DISPLAYS a streak,
  `statsRecorded` replay marker, and the multi-tab guard in
  `saveDailyProgress`.

**State-integrity patterns (copy from an existing game hook)**
- Freeze the clock at the finish; re-stamp per post-finish word if the
  game allows play past its solve threshold. Active-time only
  (pause on `visibilitychange`), flush saves on hide/pagehide/unmount,
  `abandonSession()` before replay resets.
- Daily puzzles derive from the LOCAL date; dateKey is frozen per
  mount. Streak writes use the midnight grace day ONLY in daily mode
  (`allowGrace=false` for archive plays).

## Verification

`npx vitest run` and `npm run build` must pass before any commit.
For UI changes, drive the real build: `npm run preview` (:4173) +
playwright-core scripts in the session scratchpad (import from
`node_modules/playwright-core/index.mjs`, executablePath
`/opt/pw-browsers/chromium`). House checks cover: no-scroll (default,
Huge text, simulated notch insets), a11y focus paths, settings, the
update flow, and per-game smokes. Screenshot both themes at 390x844
for anything visual.
