import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { trackStarted, trackSolved } from "../../../lib/analytics";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { useDailyClock } from "../../../lib/daily/useDailyClock";
import { streakAdvance } from "../../../lib/daily/persistence";
import { getDailyPuzzle } from "../engine/dailySeed";
import { getPracticePuzzle } from "../engine/practice";
import { TUTORIAL_PUZZLE } from "../engine/tutorial";
import type { Difficulty } from "../engine/types";
import { cellsFitPuzzle } from "../engine/validation";
import { gameReducer, initialState, isStartState, type GameState } from "./reducer";
import {
  loadDailyProgress,
  loadStaleDailyProgress,
  otherBoardsSolved,
  saveDailyProgress,
  serpentinePuzzleKey,
  recordStarted,
  updateStats,
  type DayProgress,
  type SerpentineStats,
} from "./persistence";

export type GameMode =
  | { kind: "daily"; dateKey: string; difficulty: Difficulty }
  | { kind: "archive"; dateKey: string; difficulty: Difficulty }
  | { kind: "practice"; seed: string; difficulty: Difficulty }
  | { kind: "tutorial"; difficulty: Difficulty };

/** Modes whose progress is written to storage — see `persisted` below. */
function isPersisted(mode: GameMode): boolean {
  return mode.kind === "daily" || mode.kind === "archive";
}

export function useSerpentineGame(mode: GameMode) {
  const difficulty = mode.difficulty;
  const persisted = isPersisted(mode);
  const dateKey =
    mode.kind === "daily" || mode.kind === "archive" ? mode.dateKey : "";
  const puzzle = useMemo(
    () =>
      mode.kind === "tutorial"
        ? TUTORIAL_PUZZLE
        : mode.kind === "practice"
          ? getPracticePuzzle(mode.seed, mode.difficulty)
          : getDailyPuzzle(difficulty, dateKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode.kind, mode.kind === "practice" ? mode.seed : dateKey, difficulty],
  );

  const pKey = useMemo(() => serpentinePuzzleKey(puzzle), [puzzle]);

  const [state, dispatch] = useReducer(
    gameReducer,
    { puzzle, difficulty },
    ({ puzzle, difficulty }) => initialState(puzzle, difficulty),
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  const persistRef = useRef<() => void>(() => {});
  const clock = useDailyClock({
    flush: () => persistRef.current(),
    resetKey: `${difficulty}:${dateKey}`,
  });

  const solvedElapsedMs = useRef<number | null>(null);
  const statsRecorded = useRef(false);
  const abandoned = useRef(false);
  const hydratedAsSolved = useRef(false);
  const hintsRef = useRef(0);
  const staleRecordRef = useRef(false);

  // Hydrate from storage — hydrated flips ONLY after the async load
  // completes so the save effect cannot clobber stored progress with
  // the empty initial state.
  const hydrated = useRef(!persisted);
  useEffect(() => {
    if (hydrated.current) return;
    let cancelled = false;
    void loadDailyProgress(difficulty, dateKey, pKey).then(async (saved) => {
      if (cancelled) return;
      // puzzleId is the pool index, which survives a phrase being
      // corrected — so the cells still have to be checked against the
      // grid this build generates.
      if (saved && saved.puzzleId === puzzle.id && cellsFitPuzzle(saved.cells, puzzle)) {
        clock.hydrate(saved.elapsedMs, saved.solved);
        statsRecorded.current = !!saved.statsRecorded;
        hintsRef.current = saved.hints ?? 0;
        if (saved.solved) {
          solvedElapsedMs.current = saved.elapsedMs;
          hydratedAsSolved.current = true;
        }
        dispatch({
          type: "hydrate",
          cells: saved.cells,
          solved: saved.solved,
        });
        hydrated.current = true;
      } else if (persisted) {
        // A save we just refused still means the day was counted. It is
        // not "stale" by the version test — it matches this build — so
        // loadStaleDailyProgress will not return it, and without this
        // fallback recordStarted would count the day a second time.
        const stale =
          (await loadStaleDailyProgress(difficulty, dateKey, pKey)) ?? saved;
        if (cancelled) return;
        if (stale) {
          staleRecordRef.current = true;
          statsRecorded.current = stale.solved || stale.statsRecorded === true;
        } else {
          void recordStarted();
          trackStarted("serpentine");
        }
        hydrated.current = true;
      } else {
        hydrated.current = true;
      }
    });
    return () => { cancelled = true; };
    // `puzzle` rather than `puzzle.id`: the grid is read here too, and
    // it is memoized on the same keys pKey already tracks.
  }, [difficulty, dateKey, puzzle, pKey, clock, persisted]);

  // Build the progress blob from current state.
  const buildProgress = useCallback(
    (s: GameState): DayProgress => ({
      dateKey,
      difficulty,
      puzzleId: puzzle.id,
      puzzleKey: pKey,
      dictVersion: DICT_VERSION,
      solved: s.solved,
      elapsedMs: s.solved
        ? (solvedElapsedMs.current ?? clock.rawElapsedMs())
        : clock.rawElapsedMs(),
      cells: s.cells,
      statsRecorded: statsRecorded.current,
      hints: hintsRef.current,
    }),
    [dateKey, difficulty, puzzle.id, pKey, clock],
  );

  persistRef.current = () => {
    if (!persisted || !hydrated.current || abandoned.current) return;
    // The untouched board is the given letter, not an empty snake.
    if (staleRecordRef.current && isStartState(stateRef.current)) return;
    staleRecordRef.current = false;
    void saveDailyProgress(buildProgress(stateRef.current));
  };

  // Save on every state change.
  useEffect(() => {
    if (!persisted || !hydrated.current || abandoned.current) return;
    if (staleRecordRef.current && isStartState(state)) return;
    staleRecordRef.current = false;
    void saveDailyProgress(buildProgress(state));
  }, [state, buildProgress, persisted]);

  // Track analytics solve event (all modes, once per session).
  const solveTrackedRef = useRef(false);
  useEffect(() => {
    if (state.solved && !solveTrackedRef.current && !hydratedAsSolved.current) {
      solveTrackedRef.current = true;
      trackSolved("serpentine");
    }
  }, [state.solved]);

  // Record solve.
  useEffect(() => {
    if (!state.solved || statsRecorded.current) return;
    const elapsed = clock.freeze();
    solvedElapsedMs.current = elapsed;
    statsRecorded.current = true;

    if (persisted) {
      void saveDailyProgress({
        ...buildProgress(state),
        elapsedMs: elapsed,
        statsRecorded: true,
        solvedHour: new Date().getHours(),
      } as DayProgress).then(async () => {
        const isDaily = mode.kind === "daily";
        // The streak belongs to the DAY, and a day is both boards — the
        // rule the hub card has always used for "done".
        const dayComplete = await otherBoardsSolved(dateKey, difficulty);
        void updateStats((s: SerpentineStats) => {
        const bestKey =
          difficulty === "haiku" ? "bestTimeHaiku" : "bestTimePoem";
        const bestTime = s[bestKey];
        return {
          ...s,
          // Boards, matching `played` — only the streak counts days.
          solved: s.solved + 1,
          [bestKey]:
            bestTime === null || elapsed < bestTime ? elapsed : bestTime,
          ...(dayComplete ? streakAdvance(s, dateKey, isDaily) : {}),
        };
      });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.solved, clock, buildProgress, mode.kind, difficulty, dateKey, persisted]);

  const abandonSession = useCallback(() => {
    abandoned.current = true;
  }, []);

  const setHints = useCallback((count: number) => {
    hintsRef.current = count;
    if (persisted && hydrated.current && !abandoned.current) {
      void saveDailyProgress(buildProgress(stateRef.current));
    }
  }, [persisted, buildProgress]);

  return {
    state,
    dispatch,
    puzzle,
    solvedElapsedMs: solvedElapsedMs.current,
    hydratedAsSolved: hydratedAsSolved.current,
    hydratedHints: hintsRef.current,
    setHints,
    abandonSession,
  };
}
