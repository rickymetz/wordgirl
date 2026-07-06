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
  // Completed before this session → the timer stays frozen.
  const alreadyCompletedRef = useRef(false);
  // Stats already counted (completed earlier OR this is a replay run) →
  // don't record completion again.
  const statsRecordedRef = useRef(false);
  // Play-time tracking: previously saved elapsed + this session's ACTIVE
  // time. The clock pauses while the app is backgrounded — completed
  // visible stretches accumulate in sessionActiveMsRef, and
  // sessionStartRef marks the start of the current visible stretch.
  const savedElapsedRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const sessionActiveMsRef = useRef(0);
  useEffect(() => {
    if (!persisted) return;
    const onVisibility = () => {
      if (document.hidden) {
        sessionActiveMsRef.current += Date.now() - sessionStartRef.current;
      } else {
        sessionStartRef.current = Date.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, [persisted]);
  useEffect(() => {
    if (!persisted || hydratedRef.current) return;
    hydratedRef.current = true;
    let cancelled = false;
    loadDailyProgress(dateKey).then((saved) => {
      if (cancelled) return;
      if (saved) {
        alreadyCompletedRef.current = saved.completed;
        statsRecordedRef.current = saved.completed || saved.statsRecorded === true;
        savedElapsedRef.current = saved.elapsedMs ?? 0;
        sessionStartRef.current = Date.now();
        sessionActiveMsRef.current = 0;
        // Older saves stored a revealed-letter COUNT; normalize to
        // position arrays (prefix positions).
        const revealed = Object.fromEntries(
          Object.entries(saved.revealed ?? {}).map(([word, v]) => [
            word,
            Array.isArray(v)
              ? v
              : Array.from({ length: v as number }, (_, i) => i),
          ]),
        );
        // Saves from before auto-submit can hold fully-revealed words
        // that were never typed — count them as found (floor score).
        const found = [...saved.foundWords];
        let score = saved.score;
        for (const [word, positions] of Object.entries(revealed)) {
          if (positions.length >= word.length && !found.includes(word)) {
            found.push(word);
            score += 1;
          }
        }
        dispatch({ type: "hydrate", found, revealed, score });
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
    const activeMs =
      sessionActiveMsRef.current +
      (document.hidden ? 0 : Date.now() - sessionStartRef.current);
    const elapsedMs = alreadyCompletedRef.current
      ? savedElapsedRef.current
      : savedElapsedRef.current + activeMs;
    void saveDailyProgress({
      dateKey,
      dictVersion: DICT_VERSION,
      foundWords: state.found,
      revealed: state.revealed,
      score: state.score,
      completed: state.phase === "done",
      elapsedMs,
      // Preserve the replay marker across saves.
      ...(statsRecordedRef.current && { statsRecorded: true }),
    });
  }, [persisted, dateKey, state.found, state.revealed, state.score, state.phase]);

  // Record completion (stats; streak only if it's today) exactly once.
  const completedRef = useRef(false);
  useEffect(() => {
    if (
      !persisted ||
      state.phase !== "done" ||
      completedRef.current ||
      statsRecordedRef.current
    ) {
      return;
    }
    completedRef.current = true;
    void recordDailyCompleted(dateKey, state.score, rankFor(state.score, puzzle));
  }, [persisted, dateKey, state.phase, state.score, puzzle]);

  return { state, dispatch, puzzle };
}
