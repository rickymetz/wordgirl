# WordGirl — house rules

Mobile-first, offline-capable PWA game hub. One Vite app; each game is
a folder under `src/games/<id>/` plus one entry in
`src/games/registry.ts`. Engines are pure TS (`engine/`), state hooks
in `state/`, React in `ui/`. See README for architecture.

## Game kit — check here BEFORE building anything

Shared primitives live in `src/components/` (+ `src/components/game/`)
and `src/lib/`. The rule: before writing any UI piece or state helper
for a game, check this list; if you catch yourself copying code from a
sibling game a SECOND time, extract it into the kit instead of pasting.

**Board & feedback** (`src/components/game/`)
- `Tile` / `tileClasses(tone, mini?)` — THE letter tile, four tones:
  `tile` (resting), `surface` (punch-out on tinted panels), `accent`,
  `ghost` (translucent reading). Motion-wrapped tiles (layoutId, drag)
  take `tileClasses(...)` as their className; `mini` is bento-card
  sizing. `TileSocket` is the dashed empty home (subdued on tint).
- `GameToast` + `useToast()` — the floating feedback pill over a
  board (`mode="wait"`, positioned via className) and its state/timer.
  Mirror `toast?.text` into an `aria-live` region for narration.

**Results & sharing**
- `ShareButton` (`components/`) + `useShare()` (`lib/share.ts`) — the
  accent share pill: native sheet, clipboard fallback, "Copied!"
  flash. Cards render `<ShareButton text={buildShareText(...)} />`;
  only the game's share STRING is local. `SHARE_URL` and
  `formatShareDate()` (`lib/date.ts`) build it.

**Hub & archive**
- `GameStatus` — the hub-card date + play-state line; games pass
  `loadState`/`loadStreak` loaders (~15 lines per game).
- `GameArchive` — the whole archive page from a config (see the
  Archive section below). Preview art is per-game, composed from
  `Tile mini` (see `BackwordsPreview` for the idiom).
- `GameTrends` — the stats-over-time page from a config: per-metric
  single-series Tufte SPARKLINES in the game's accent (validated: the
  four accents FAIL as a categorical set, so never chart games against
  each other), tap-a-day for its value. Route it at `stats` with a
  "Stats" secondary action; metrics read from the archive day saves
  (new metrics need new save fields and accrue from ship day; days
  saved before a metric shipped chart as GAPS via `null`, never fake
  zeros).

**Tutorials** (`components/game/`, `lib/tutorial/`)
- `TutorialBanner` + `TUTORIAL_BANNER_H` — the step instruction above a
  board ("Step 2 of 4", headline, one-liner), narrated via `aria-live`.
  It owns the gap under itself (`mb-3`) and renders NOTHING once the
  script is finished, so the finish card gets the whole band back — do
  not wrap it in a spacer div, which would leave the gap behind. A board
  whose height budget actually binds must add `TUTORIAL_BANNER_H` to its
  `CHROME_H` via the `reservedH` prop, or the tutorial overflows at the
  Huge text setting — `PolygonBoard`, `GridBoard`, `MirrorBoard` and
  doublet's `Board` all do. Watch for a `min-h-*` FLOOR on the board too:
  it outranks the budget, and on Backwords it — not `CHROME_H` — was what
  pushed the rack off a 375×667 screen at Huge, so `MirrorBoard` drops to
  `min-h-40` in tutorial mode. Re-measure rather than assume: the check is
  every viewport × Huge text, and the budget is what tells you which group
  a board is in. Keep step bodies to TWO lines at default text — the
  constant is sized for that. (Known gap: at 320×568 with Huge text the
  DAILY screens scroll too — an app-wide budget limit, not a tutorial one.)
  `SnakeGrid` is the exception that needs none of this: it MEASURES the box
  the flex column leaves it (see below), so a banner is just chrome that
  leaves less room. Prefer that where a screen's chrome is variable.
- `TutorialDone` — the finish card that stands in for a game's results
  block: no time, no score, no share, a link to the daily. It takes focus
  on mount and announces itself: `data-autofocus` is only read by
  `useModalFocus`, and a results block is not a dialog, so the card
  focuses itself explicitly.
- `TutorialPrompt` (`components/`) — the once-per-game first-visit offer,
  mounted on the DAILY only (`enabled={mode.kind === "daily"}`). It owns
  its own `tutorialSeen` load/mark. **The coach sheet no longer
  auto-opens** — it is the "?" button only, and takes a `tutorialTo` prop
  that adds a "Play the tutorial" link.
- Three ways in, in order of how most players will meet it: the first-visit
  prompt, the hub bento's `Tutorial` tile (LAST in `secondaryActions`,
  after Stats), and the coach sheet's link. That fourth bento tile is why
  `GameCard`'s secondary actions are a two-column GRID on phones — as a
  horizontal scroller the fourth tile started at x=364 in a 390px
  viewport, entirely off screen, so the tutorial had no visible way back
  once the prompt was answered. It is also why the tiles carry
  `md:min-h-11`: on md+ the cluster is a column dividing a fixed height,
  so a fourth action drove each tile to 28px, under the touch floor.
- `TutorialStep` (`lib/tutorial/types.ts`) + `useTutorialProgress` (a
  monotonic clamp, so a step never flaps backwards when the player
  undoes). Each game owns `engine/tutorial.ts` (the hand-picked puzzle
  and a pure `tutorialStepIndex`, no React) and `ui/tutorialSteps.tsx`
  (the JSX copy + `TUTORIAL_RECAP`).
- A tutorial is a fourth `GameMode` arm, `{ kind: "tutorial" }`, and is
  NOT persisted: every hook derives `persisted` from an
  `isPersisted(mode)` allowlist (`daily` or `archive`), never
  `!== "practice"`. `tutorialSeen` lives OUTSIDE the `daily:` prefix so
  it can't reach the archive calendar or the trends charts.
- Tutorial puzzles are hand-picked and bypass the generators, whose
  bands are tuned for a day's play. Put them in their own module — never
  append to `SHAPES`/`THEME_POOLS`, which daily seeds index by position.
  Each has an `engine/tutorial.test.ts` asserting the puzzle against the
  REAL dictionary (word lists exhaustive, decomposition unique, board
  solvable) so a dictionary change can't silently make it teach a lie.
- Hints and day-scale progress chrome are hidden in tutorial mode (a
  rank of "Beginner" out of a five-word toy measures nothing).

**Dialogs & chrome**
- `BottomSheet`, `CoachSheet` (+ `Key`), `ModalDialog`,
  `useModalFocus` (mark initial focus `data-autofocus`), `HomeLink`,
  `SettingsDialog`.
- `HoldButton` — press-and-hold (default 1s) for one-way actions a
  stray thumb must not trigger (Polygram's level skip). The house
  alternative to a confirmation dialog when the action is small enough
  that a modal would be heavier than the mistake. Owns the gesture,
  the sweep, and a 44px `::after` touch floor; sizing and color come
  from `className`. Label it with the gesture ("Hold to skip level").
  Its sweep is `--color-press-fill`, which moves AWAY from the surface
  color so an on-accent label GAINS contrast as the fill passes under
  it — never re-tint it toward `surface`, which sinks the label to
  ~2.6:1.

**State & engine** (`src/lib/`)
- `createGameStore(gameId)` — namespaced storage.
- `useToday()` — live local dateKey (midnight rollover, PWA resume).
- `useViewport()` — `{vw, vh, rem}` for board budgets (vh excludes
  safe-area; rem is the Text-size setting — scale px constants by
  `rem/16`).
- `seededRandom(seed)`, `shuffle` (`lib/random.ts`); date helpers
  (`localDateKey`, `previousDateKey`, `dateKeyRange`, `formatDateKey`,
  `formatShareDate`, `formatDuration`); the shared dictionary
  (`lib/words`: `parseDictionary`, `loadDictionary`, `DICT_VERSION` —
  bump it whenever puzzle derivation changes).

**Reference implementations** (game-specific, copy the pattern)
- Drag: `backwords/ui/dragPoint.ts` (`dragPoint`, `dragCancelled`,
  `overBoard`) + the LetterBank/MirrorBoard wiring — pointer-fallback,
  cancel-aborts, tap-vs-drag guard, live-ghost via direct DOM writes
  (never setState per drag frame).
- Daily persistence: `lib/daily/persistence.ts` —
  `createDailyPersistence()` owns the store, save guards
  (version-ordering, solved-final, per-game unsolved veto), stats
  lock/defaults-merge, coachSeen, plus `streakAdvance`/`countsAsToday`/
  `displayStreak`. `lib/daily/useDailyClock.ts` owns active-time
  (pause on hide, flush, freeze-at-solve). All five games use both.
- Dominoes/two-cell pieces: `doublet/ui/DominoTray.tsx`; polygon
  morphing: `polygram/ui/`.

## Style rules (apply to every new game)

**Color**
- Every color is a `light-dark()` token in `src/index.css`. Never
  hardcode a hex in a component — read tokens (`--level-N`,
  `--color-*`) via Tailwind utilities or `var()`.
- Each game owns ONE palette key, set as `GameDefinition.accentLevel`
  (a Polygram level number or the game's own key, e.g. `"crosshatch"`).
  Scope every game surface — game screen, archive, practice — with
  `data-level={accentLevel}` so `bg-accent`/`text-accent` resolve to
  the game's color. The root accent is neutral black/white — the hub
  and settings are monochrome; no surface wears a purple accent.
- Light-mode accents are ~700-weight shades: accent text on surface
  AND surface text on accent must clear WCAG AA (4.5:1).
- Tinted panels use `bg-surface-tint` (6% accent light / 13% dark).
  Elements ON a tinted panel punch out with `bg-surface` — never
  `bg-tile`, which is a warm grey tuned for plain surfaces and reads
  as a stain on tint.

**Charts (every new chart, no exceptions)**
- Invoke the bundled `dataviz` skill BEFORE designing any new chart
  and follow its procedure (form first, color last, run
  `scripts/validate_palette.js` — never eyeball CVD/contrast).
- The house chart style is Tufte: maximize data-ink — sparkline-scale
  marks, a range-frame spanning only the played days as the sole
  scaffold, direct labels on the extremes instead of axes, gaps (not
  zeros) for missing days, values on tap. `GameTrends` is the
  reference implementation; extend it rather than hand-rolling.
- One accent hue per chart. Cross-game comparison charts are banned
  (the four game accents fail as a categorical set — validated).

**Copy & iconography**
- Neutral, descriptive labels. No flavor text, no bylines, no jargon
  ("banked"). Rank/coach headlines are plain ("Clear the level", not
  "Grow the flock").
- lucide-react icons only in UI chrome — emoji are allowed ONLY inside
  share strings. Share strings end with `SHARE_URL` (`src/lib/share.ts`),
  and no blank line before it — the whole result is three tight lines.
- A game's title glyph comes AFTER the title, never before
  ("Serpentine ⟆", not "⟆ Serpentine") — in game headers and anywhere
  else the pairing appears (docs, marketing). Share strings are the one
  exception: they LEAD with the game's emoji, so the first character in
  a pasted result identifies the game (🐍 Serpentine, 👯‍♂️ Doublet,
  🔻 Polygram, 🪞 Backwords, 🧺 Crosshatch).
- Blanks are monospaced `?` in `font-game` (Rubik Mono One) wherever a
  hidden letter appears — chips, word lists, typed-word tray — so
  nothing reflows as letters fill in.

**Layout & interaction**
- No game screen may have a page scroll when content fits. `#root` is
  exactly 100dvh with safe-area padding inside it; pages use `grow`,
  never `min-h-dvh`. Board height budgets must scale with the root
  font-size — use `src/lib/useViewport.ts` (`vh` excludes safe-area
  insets; `rem` is the Text-size setting).
- Two ways to budget a board's height. A `CHROME_H` constant subtracted
  from `vh` (four of the five boards) is fine where the chrome around it
  is FIXED. Where it is not — Serpentine's poem credit wraps to one, two
  or three lines and its readout follows the phrase's length — a constant
  tuned on one puzzle is wrong for the next, so `SnakeGrid` measures
  instead: the board container is `flex min-h-0 flex-1`, the board's
  wrapper is `flex-1 min-h-0` inside it, and the board itself is absolute,
  contributing no height of its own. That last part is what keeps it a
  measurement and not a feedback loop. Note `h-full` does NOT work for the
  wrapper — an absolute child leaves no content height for a percentage to
  resolve against, and it silently measures 0.
- The touch floor OUTRANKS the no-scroll rule. A board gives way to its
  height budget only down to a tappable cell (`MIN_CELL`); past that it
  stops shrinking and the page scrolls, because a board too small to hit
  is a broken game and a scroll is only an ugly one. Width still binds
  absolutely — a board wider than the screen cannot be tapped at all.
  When the floor wins, put a `minHeight` on the board's wrapper so the
  column grows and the page scrolls; without it an absolutely positioned
  board simply sits on top of the controls.
- A board that can be squeezed must scale its TYPE with its cells, not
  just its geometry (`LETTER_MAX_RATIO` in `SnakeGrid`). A rem-sized
  letter in a shrunken cell overflows it, and where the letters sit on a
  drawn overlay they visibly part company with it. Make it a CAP, not a
  ratio: the letter keeps its rem size — which is what the Text-size
  setting is for — and gives that up only on a cell too small to hold it.
- Cell sizes floor to whole pixels. A fractional cell makes a board a
  fraction taller than the box it was measured against, which is a page
  scroll of a pixel or two and nothing else.
- Fixed paddings need a `[@media(max-height:720px)]` variant wherever they
  stack up: 50px of `pt-10` at Huge text is the difference between a board
  that fits and one that scrolls on a 667px screen.
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
- On hydration, if `loadDailyProgress` returns null, check
  `loadStaleDailyProgress` before calling `recordStarted()`. A
  stale save means the day was already counted — set
  `statsRecorded` from it and skip the played increment.

## New game checklist

1. `src/games/<id>/` with `engine/`, `state/`, `ui/` subdirs
2. Entry in `src/games/registry.ts` with `accentLevel`
3. Color token `[data-level="<id>"]` in `src/index.css`
4. Persistence via `createDailyPersistence` + `loadStaleDailyProgress`
5. Clock via `useDailyClock` (never inline)
6. `ArchivePage` using `GameArchive` component (~30 lines config)
7. `TrendsPage` using `GameTrends` with `solvedHour` metric
8. Hub card via `GameStatus`
9. Bento preview component using `Tile mini`
10. Coach sheet via `CoachSheet` (opened by "?" only — never auto)
11. Share string ending with `SHARE_URL`
12. Replay confirmation dialog via `ModalDialog`
13. Tutorial: `engine/tutorial.ts` + `ui/tutorialSteps.tsx` +
    `ui/TutorialPage.tsx`, a `tutorial` entry in BOTH `extraRoutes` and
    `secondaryActions` (last, after Stats), and
    `TutorialPrompt`/`TutorialBanner`/`TutorialDone` in the GameScreen
14. `engine/*.test.ts` + `state/reducer.test.ts` + `state/persistence.dom.test.ts`
15. Run `scripts/validate_palette.js` after adding accent color

## Pre-merge review checklist

Before merging any game feature, verify:
- Hydration sets `hydrated.current` INSIDE the async callback
- Clock `resetKey` includes all relevant keys (difficulty, dateKey)
- `updateStats` chains AFTER `saveDailyProgress` completes
- `loadStaleDailyProgress` fallback prevents played double-count
- `preserveAspectRatio="xMidYMid meet"` on SVG overlays
- Board dimensions scale by `rem/16` via `useViewport`
- `e.preventDefault()` on game-surface pointer handlers
- ShareButton gated on `dateKey` (no practice- or tutorial-mode shares)
- `persisted` is an `isPersisted(mode)` allowlist, not `!== "practice"`
- Tutorial mode: no save, no stats, no streak, no hints, no share
- Tutorial fits with no page scroll at Huge text, at 375px wide and up —
  `reservedH` added to the board's budget wherever that budget binds, and
  any `min-h-*` board floor lowered to match
- Every control a tutorial step NAMES actually exists on screen. A step
  that says "tap X" when X is a hidden gesture is a dead end, not a
  wording nit — the tutorial is the one screen with no hints to fall back
  on. Play each tutorial following only its own instructions
- Replay shows a confirmation dialog
- Archive separators use `·` not `.`
- No emoji in UI chrome (share strings only)
- All three test files exist (engine, reducer, persistence DOM)

## Verification

`npx vitest run` and `npm run build` must pass before any commit.
For UI changes, drive the real build: `npm run preview` (:4173) +
playwright-core scripts in the session scratchpad (import from
`node_modules/playwright-core/index.mjs`, executablePath
`/opt/pw-browsers/chromium`). House checks cover: no-scroll (default,
Huge text, simulated notch insets), a11y focus paths, settings, the
update flow, and per-game smokes. Screenshot both themes at 390x844
for anything visual.
