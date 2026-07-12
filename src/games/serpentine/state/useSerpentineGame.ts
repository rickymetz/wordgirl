import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { useDailyClock } from "../../../lib/daily/useDailyClock";
import { streakAdvance } from "../../../lib/daily/persistence";
import { getDailyPuzzle } from "../engine/dailySeed";
import { getPracticePuzzle } from "../engine/practice";
import type { Difficulty } from "../engine/types";
import { gameReducer, initialState, type GameState } from "./reducer";
import {
  loadDailyProgress,
  loadStaleDailyProgress,
  saveDailyProgress,
  recordStarted,
  updateStats,
  type DayProgress,
  type SerpentineStats,
} from "./persistence";

export type GameMode =
  | { kind: "daily"; dateKey: string; difficulty: Difficulty }
  | { kind: "archive"; dateKey: string; difficulty: Difficulty }
  | { kind: "practice"; seed: string; difficulty: Difficulty };

export function useSerpentineGame(mode: GameMode) {
  const difficulty = mode.difficulty;
  const dateKey = mode.kind === "practice" ? "" : mode.dateKey;
  const persisted = mode.kind !== "practice";
  const puzzle = useMemo(
    () =>
      mode.kind === "practice"
        ? getPracticePuzzle(mode.seed, mode.difficulty)
        : getDailyPuzzle(difficulty, dateKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode.kind, mode.kind === "practice" ? mode.seed : dateKey, difficulty],
  );

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

  // Hydrate from storage — hydrated flips ONLY after the async load
  // completes so the save effect cannot clobber stored progress with
  // the empty initial state.
  const hydrated = useRef(!persisted);
  useEffect(() => {
    if (hydrated.current) return;
    let cancelled = false;
    void loadDailyProgress(difficulty, dateKey).then(async (saved) => {
      if (cancelled) return;
      hydrated.current = true;
      if (saved && saved.puzzleId === puzzle.id) {
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
      } else if (persisted) {
        const stale = await loadStaleDailyProgress(difficulty, dateKey);
        if (cancelled) return;
        if (stale) {
          statsRecorded.current = stale.solved || stale.statsRecorded === true;
        } else {
          void recordStarted();
        }
      }
    });
    return () => { cancelled = true; };
  }, [difficulty, dateKey, puzzle.id, clock, persisted]);

  // Build the progress blob from current state.
  const buildProgress = useCallback(
    (s: GameState): DayProgress => ({
      dateKey,
      difficulty,
      puzzleId: puzzle.id,
      dictVersion: DICT_VERSION,
      solved: s.solved,
      elapsedMs: s.solved
        ? (solvedElapsedMs.current ?? clock.rawElapsedMs())
        : clock.rawElapsedMs(),
      cells: s.cells,
      statsRecorded: statsRecorded.current,
      hints: hintsRef.current,
    }),
    [dateKey, difficulty, puzzle.id, clock],
  );

  persistRef.current = () => {
    if (!persisted || !hydrated.current || abandoned.current) return;
    void saveDailyProgress(buildProgress(stateRef.current));
  };

  // Save on every state change.
  useEffect(() => {
    if (!persisted || !hydrated.current || abandoned.current) return;
    void saveDailyProgress(buildProgress(state));
  }, [state, buildProgress, persisted]);

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
      } as DayProgress).then(() => {
        const isDaily = mode.kind === "daily";
        void updateStats((s: SerpentineStats) => {
        const bestKey =
          difficulty === "haiku" ? "bestTimeHaiku" : "bestTimePoem";
        const bestTime = s[bestKey];
        return {
          ...s,
          solved: s.solved + 1,
          [bestKey]:
            bestTime === null || elapsed < bestTime ? elapsed : bestTime,
          ...streakAdvance(s, dateKey, isDaily),
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
