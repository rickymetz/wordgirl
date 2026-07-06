import { useEffect, useMemo, useReducer, useRef } from "react";
import { localDateKey } from "../../../lib/date";
import dictRaw from "../assets/dictionary.txt?raw";
import { DICT_VERSION, parseDictionary } from "../engine/dictionary";
import { dailySeed, generatePuzzle } from "../engine/generator";
import { rankFor } from "../engine/scoring";
import {
  loadDailyProgress,
  recordDailyCompleted,
  recordDailyStarted,
  saveDailyProgress,
} from "./persistence";
import { gameReducer, initialState } from "./reducer";

let dictSingleton: ReturnType<typeof parseDictionary> | null = null;
export function getDictionary() {
  dictSingleton ??= parseDictionary(dictRaw);
  return dictSingleton;
}

export type GameMode = { kind: "daily" } | { kind: "practice"; seed: string };

export function usePolygramGame(mode: GameMode) {
  const dateKey = localDateKey();
  const seed = mode.kind === "daily" ? dailySeed(dateKey) : mode.seed;

  const puzzle = useMemo(() => generatePuzzle(getDictionary(), seed), [seed]);
  const [state, dispatch] = useReducer(gameReducer, puzzle, initialState);

  // Daily: hydrate from storage once, and count a new day as "played".
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (mode.kind !== "daily" || hydratedRef.current) return;
    hydratedRef.current = true;
    let cancelled = false;
    loadDailyProgress(dateKey).then((saved) => {
      if (cancelled) return;
      if (saved) {
        dispatch({
          type: "hydrate",
          found: saved.foundWords,
          revealed: saved.revealed,
          score: saved.score,
        });
      } else {
        void recordDailyStarted();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mode.kind, dateKey]);

  // Daily: persist after every meaningful change.
  useEffect(() => {
    if (mode.kind !== "daily" || !hydratedRef.current) return;
    void saveDailyProgress({
      dateKey,
      dictVersion: DICT_VERSION,
      foundWords: state.found,
      revealed: state.revealed,
      score: state.score,
      completed: state.phase === "done",
    });
  }, [mode.kind, dateKey, state.found, state.revealed, state.score, state.phase]);

  // Daily: record completion (streaks/stats) exactly once.
  const completedRef = useRef(false);
  useEffect(() => {
    if (mode.kind !== "daily" || state.phase !== "done" || completedRef.current) {
      return;
    }
    completedRef.current = true;
    void recordDailyCompleted(dateKey, state.score, rankFor(state.score, puzzle));
  }, [mode.kind, dateKey, state.phase, state.score, puzzle]);

  return { state, dispatch, puzzle };
}
