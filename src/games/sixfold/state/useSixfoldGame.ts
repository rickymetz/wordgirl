import {
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { trackSolved, trackStarted } from "../../../lib/analytics";
import { useDailyClock } from "../../../lib/daily/useDailyClock";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { loadDictionary } from "../../../lib/words/loader";
import { dailyPuzzle, practicePuzzle, type Difficulty } from "../engine/generator";
import { TUTORIAL_PUZZLE } from "../engine/tutorial";
import {
  sixfoldPuzzleKey,
  loadDailyProgress,
  loadStaleDailyProgress,
  recordDailySolved,
  recordDailyStarted,
  saveDailyProgress,
} from "./persistence";
import {
  BLANK,
  gameReducer,
  initialEntries,
  initialState,
  type Action,
  type GameState,
} from "./reducer";

export type GameMode =
  | { kind: "daily"; dateKey: string }
  | { kind: "archive"; dateKey: string }
  | { kind: "practice"; seed: string; difficulty?: Difficulty }
  | { kind: "tutorial" };

/** Modes whose progress is written to storage. An allowlist, so a new
 *  mode is unsaved until someone decides otherwise. */
export function isPersisted(mode: GameMode): boolean {
  return mode.kind === "daily" || mode.kind === "archive";
}

/** Actions that change the board itself (not selection or mode). */
const EDITS: ReadonlySet<Action["type"]> = new Set(["pressLetter", "erase", "revealHint"]);

export function useSixfoldGame(mode: GameMode) {
  // The dateKey is FROZEN per mount (pages key the component by date
  // and remount on rollover) — it must never drift mid-session.
  const persisted = isPersisted(mode);
  const dateKey =
    mode.kind === "daily" || mode.kind === "archive" ? mode.dateKey : "";

  // Suspends until the dictionary asset loads (router Suspense boundary).
  const dict = use(loadDictionary());
  const seed = mode.kind === "practice" ? mode.seed : "";
  const practiceDifficulty = mode.kind === "practice" ? mode.difficulty : undefined;
  const puzzle = useMemo(
    () =>
      mode.kind === "tutorial"
        ? TUTORIAL_PUZZLE
        : mode.kind === "practice"
          ? practicePuzzle(dict, seed, practiceDifficulty).puzzle
          : dailyPuzzle(dict, dateKey).puzzle,
    [dict, dateKey, seed, practiceDifficulty, mode.kind],
  );
  const pKey = useMemo(() => sixfoldPuzzleKey(puzzle), [puzzle]);
  const [state, rawDispatch] = useReducer(gameReducer, puzzle, initialState);

  // This tab changed its OWN board: its entries are the truth, and the
  // multi-tab guard lets its writes through. Derived from the actual
  // entries transition, so hydration never claims ownership.
  const editedRef = useRef(false);
  const lastActionRef = useRef<Action["type"] | null>(null);
  const dispatch = useCallback((action: Action) => {
    lastActionRef.current = action.type;
    rawDispatch(action);
  }, []);
  const prevEntriesRef = useRef(state.entries);
  useEffect(() => {
    if (state.entries !== prevEntriesRef.current) {
      prevEntriesRef.current = state.entries;
      if (lastActionRef.current && EDITS.has(lastActionRef.current)) {
        editedRef.current = true;
      }
    }
  }, [state.entries]);

  // Flips only AFTER hydration completes — saving before that would
  // clobber stored progress with the empty initial board.
  const hydratedRef = useRef(false);
  // Stats already counted (solved earlier OR this is a replay run).
  const statsRecordedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const persistRef = useRef<() => void>(() => {});
  const clock = useDailyClock({
    flush: () => persistRef.current(),
    resetKey: dateKey,
  });

  // An old-dictionary save is on disk for this date: hold off writing
  // until real progress, so stray taps can't wipe the historical record.
  const staleRecordRef = useRef(false);
  // A replay reset wipes the save and remounts; the OLD screen's
  // unmount flush must not write the pre-reset state back over it.
  const abandonedRef = useRef(false);
  const sessionsRef = useRef<number | null>(null);
  const solvedHourRef = useRef<number | null>(null);
  const hydratedSolvedRef = useRef(false);
  const pristine = useMemo(() => initialEntries(puzzle), [puzzle]);

  const persistNow = (s: GameState): Promise<unknown> | undefined => {
    if (!persisted || !hydratedRef.current || abandonedRef.current) return;
    if (staleRecordRef.current) {
      if (s.entries === pristine && !s.solved) return;
      staleRecordRef.current = false; // real progress replaced the record
    }
    return saveDailyProgress(
      {
        dateKey,
        dictVersion: DICT_VERSION,
        puzzleKey: pKey,
        entries: s.entries,
        revealed: s.revealed,
        filled: [...s.entries].filter((ch, c) => ch !== BLANK && pristine[c] === BLANK).length,
        solved: s.solved,
        elapsedMs: clock.currentElapsedMs(),
        hints: s.hints,
        conflicts: s.conflicts,
        cluedWord: puzzle.cluedWord,
        hiddenWord: puzzle.hiddenWord,
        ...(sessionsRef.current !== null && { sessions: sessionsRef.current }),
        ...(solvedHourRef.current !== null && {
          solvedHour: solvedHourRef.current,
        }),
        ...(statsRecordedRef.current && { statsRecorded: true }),
      },
      { edited: editedRef.current },
    );
  };
  persistRef.current = () => void persistNow(stateRef.current);

  // Hydrate from storage once. StrictMode-safe: the first (cancelled)
  // run applies nothing, the second completes.
  useEffect(() => {
    if (!persisted) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadDailyProgress(dateKey, pKey);
        if (cancelled) return;
        if (saved) {
          statsRecordedRef.current =
            saved.solved || saved.statsRecorded === true;
          hydratedSolvedRef.current = saved.solved;
          sessionsRef.current =
            saved.sessions === undefined
              ? null
              : saved.solved
                ? saved.sessions
                : saved.sessions + 1;
          solvedHourRef.current = saved.solvedHour ?? null;
          clock.hydrate(saved.elapsedMs ?? 0, saved.solved);
          dispatch({
            type: "hydrate",
            entries: saved.entries,
            revealed: saved.revealed,
            solved: saved.solved,
            hints: saved.hints,
            conflicts: saved.conflicts,
          });
          hydratedRef.current = true;
          return;
        }
        const stale = await loadStaleDailyProgress(dateKey, pKey);
        if (cancelled) return;
        if (stale) {
          // The day was already counted: no second "played".
          staleRecordRef.current = true;
          statsRecordedRef.current =
            stale.solved || stale.statsRecorded === true;
          sessionsRef.current = 1;
          hydratedRef.current = true;
          return;
        }
        void recordDailyStarted();
        trackStarted("sixfold");
        sessionsRef.current = 1;
        // Write the initial save immediately so re-opening an untouched
        // day never counts as another "play".
        hydratedRef.current = true;
        void persistNow(stateRef.current);
      } catch (err) {
        console.warn("hydration failed, starting fresh", err);
        if (!cancelled) hydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, puzzle]);

  const solveTrackedRef = useRef(false);
  useEffect(() => {
    if (state.solved && !solveTrackedRef.current && !hydratedSolvedRef.current) {
      solveTrackedRef.current = true;
      trackSolved("sixfold");
    }
  }, [state.solved]);

  // Freeze the clock at the solve and record it exactly once. Declared
  // BEFORE the persist effect so the solving save carries the frozen
  // time, and the stats update chains after that save lands.
  const [solvedElapsedMs, setSolvedElapsedMs] = useState<number | null>(null);
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!state.solved) return;
    const ms = clock.freeze();
    if (solvedElapsedMs === null) setSolvedElapsedMs(ms);
    if (!hydratedSolvedRef.current && solvedHourRef.current === null) {
      solvedHourRef.current = new Date().getHours();
    }
    if (persisted && !recordedRef.current && !statsRecordedRef.current) {
      recordedRef.current = true;
      const hints = state.hints;
      const allowGrace = mode.kind === "daily";
      // The solved save lands first, THEN the stats move — a crash
      // between the two leaves a solved day uncounted rather than a
      // counted day with no solve behind it.
      const saving = persistNow(stateRef.current);
      statsRecordedRef.current = true;
      void Promise.resolve(saving).then(() =>
        recordDailySolved(dateKey, ms, hints, allowGrace),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, state.solved, solvedElapsedMs]);

  // Persist after every meaningful change.
  useEffect(() => {
    void persistNow(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, state.entries, state.solved]);

  const abandonSession = () => {
    abandonedRef.current = true;
  };

  return {
    state,
    dispatch,
    puzzle,
    pristine,
    puzzleKey: pKey,
    solvedElapsedMs,
    hydratedAsSolved: hydratedSolvedRef.current,
    abandonSession,
  };
}
