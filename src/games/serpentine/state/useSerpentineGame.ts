import { useCallback, useEffect, useReducer, useRef } from "react";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { useDailyClock } from "../../../lib/daily/useDailyClock";
import { streakAdvance } from "../../../lib/daily/persistence";
import { getDailyPuzzle } from "../engine/dailySeed";
import type { Difficulty } from "../engine/types";
import { gameReducer, initialState, type GameState } from "./reducer";
import {
  loadDailyProgress,
  saveDailyProgress,
  updateStats,
  type DayProgress,
  type SerpentineStats,
} from "./persistence";

export type GameMode =
  | { kind: "daily"; dateKey: string; difficulty: Difficulty }
  | { kind: "archive"; dateKey: string; difficulty: Difficulty };

export function useSerpentineGame(mode: GameMode) {
  const { dateKey, difficulty } = mode;
  const puzzle = getDailyPuzzle(difficulty, dateKey);

  const [state, dispatch] = useReducer(
    gameReducer,
    { puzzle, difficulty },
    ({ puzzle, difficulty }) => initialState(puzzle, difficulty),
  );

  const clock = useDailyClock({
    flush: useCallback(() => {
      // Will be wired to save in the effect below.
    }, []),
  });

  const solvedElapsedMs = useRef<number | null>(null);
  const statsRecorded = useRef(false);
  const abandoned = useRef(false);

  // Hydrate from storage.
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    void loadDailyProgress(difficulty, dateKey).then((saved) => {
      if (!saved || saved.puzzleId !== puzzle.id) return;
      clock.hydrate(saved.elapsedMs, saved.solved);
      if (saved.solved) {
        solvedElapsedMs.current = saved.elapsedMs;
        statsRecorded.current = !!saved.statsRecorded;
      }
      dispatch({
        type: "hydrate",
        paths: saved.paths,
        activeSnake: saved.activeSnake,
        solved: saved.solved,
      });
    });
  }, [difficulty, dateKey, puzzle.id, clock]);

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
      paths: s.paths.map((p) => p.cells),
      activeSnake: s.activeSnake,
      statsRecorded: statsRecorded.current,
    }),
    [dateKey, difficulty, puzzle.id, clock],
  );

  // Save on every state change.
  useEffect(() => {
    if (!hydrated.current || abandoned.current) return;
    void saveDailyProgress(buildProgress(state));
  }, [state, buildProgress]);

  // Record solve.
  useEffect(() => {
    if (!state.solved || statsRecorded.current) return;
    const elapsed = clock.freeze();
    solvedElapsedMs.current = elapsed;
    statsRecorded.current = true;

    void saveDailyProgress({
      ...buildProgress(state),
      elapsedMs: elapsed,
      statsRecorded: true,
    });

    const isDaily = mode.kind === "daily";
    void updateStats((s: SerpentineStats) => {
      const bestKey =
        difficulty === "easy"
          ? "bestTimeEasy"
          : difficulty === "medium"
            ? "bestTimeMedium"
            : "bestTimeHard";
      const bestTime = s[bestKey];
      return {
        ...s,
        solved: s.solved + 1,
        [bestKey]:
          bestTime === null || elapsed < bestTime ? elapsed : bestTime,
        ...(isDaily ? streakAdvance(s, dateKey, true) : {}),
      };
    });
  }, [state.solved, clock, buildProgress, mode.kind, difficulty, dateKey]);

  const abandonSession = useCallback(() => {
    abandoned.current = true;
  }, []);

  return {
    state,
    dispatch,
    puzzle,
    solvedElapsedMs: solvedElapsedMs.current,
    abandonSession,
  };
}
