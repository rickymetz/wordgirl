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

export type GameMode =
  | { kind: "daily" }
  | { kind: "archive"; dateKey: string }
  | { kind: "practice"; seed: string };

export function usePolygramGame(mode: GameMode) {
  // Daily and archive are the same date-keyed puzzle — archive just
  // targets a past date. Practice is seeded randomly and not persisted.
  const dateKey = mode.kind === "archive" ? mode.dateKey : localDateKey();
  const persisted = mode.kind !== "practice";
  const seed = persisted ? dailySeed(dateKey) : mode.seed;

  const puzzle = useMemo(() => generatePuzzle(getDictionary(), seed), [seed]);
  const [state, dispatch] = useReducer(gameReducer, puzzle, initialState);

  // Hydrate from storage once, and count a fresh date as "played".
  const hydratedRef = useRef(false);
  // Already completed before this session? Then don't re-record stats
  // and don't keep the completion timer running.
  const alreadyCompletedRef = useRef(false);
  // Play-time tracking: previously saved elapsed + this session's clock.
  const savedElapsedRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  useEffect(() => {
    if (!persisted || hydratedRef.current) return;
    hydratedRef.current = true;
    let cancelled = false;
    loadDailyProgress(dateKey).then((saved) => {
      if (cancelled) return;
      if (saved) {
        alreadyCompletedRef.current = saved.completed;
        savedElapsedRef.current = saved.elapsedMs ?? 0;
        sessionStartRef.current = Date.now();
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
  }, [persisted, dateKey]);

  // Persist after every meaningful change.
  useEffect(() => {
    if (!persisted || !hydratedRef.current) return;
    const elapsedMs = alreadyCompletedRef.current
      ? savedElapsedRef.current
      : savedElapsedRef.current + (Date.now() - sessionStartRef.current);
    void saveDailyProgress({
      dateKey,
      dictVersion: DICT_VERSION,
      foundWords: state.found,
      revealed: state.revealed,
      score: state.score,
      completed: state.phase === "done",
      elapsedMs,
    });
  }, [persisted, dateKey, state.found, state.revealed, state.score, state.phase]);

  // Record completion (stats; streak only if it's today) exactly once.
  const completedRef = useRef(false);
  useEffect(() => {
    if (
      !persisted ||
      state.phase !== "done" ||
      completedRef.current ||
      alreadyCompletedRef.current
    ) {
      return;
    }
    completedRef.current = true;
    void recordDailyCompleted(dateKey, state.score, rankFor(state.score, puzzle));
  }, [persisted, dateKey, state.phase, state.score, puzzle]);

  return { state, dispatch, puzzle };
}
