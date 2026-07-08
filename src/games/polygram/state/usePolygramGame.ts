import { use, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { dailySeed, generatePuzzle } from "../engine/generator";
import { levelBonus, rankFor } from "../engine/scoring";
import type { Puzzle } from "../engine/types";
import {
  loadDailyProgress,
  loadStaleDailyProgress,
  recordDailyCompleted,
  recordDailyStarted,
  saveDailyProgress,
} from "./persistence";
import { loadDictionary } from "../../../lib/words/loader";
import { gameReducer, initialState, type GameState } from "./reducer";

export type GameMode =
  | { kind: "daily"; dateKey: string }
  | { kind: "archive"; dateKey: string }
  | { kind: "practice"; seed: string };

/**
 * Older saves stored a revealed-letter COUNT per word; normalize to
 * position arrays (prefix positions).
 */
function normalizeRevealed(
  revealed: Record<string, number[] | number>,
): Record<string, number[]> {
  return Object.fromEntries(
    Object.entries(revealed ?? {}).map(([word, v]) => [
      word,
      Array.isArray(v) ? v : Array.from({ length: v }, (_, i) => i),
    ]),
  );
}

/**
 * Saves from before auto-submit can hold fully-revealed words that were
 * never typed — count them as found at the floor score, including any
 * level-clear bonus their completion earns.
 */
function migrateAutoSubmit(
  puzzle: Puzzle,
  foundWords: string[],
  revealed: Record<string, number[]>,
  score: number,
): { found: string[]; score: number } {
  const found = [...foundWords];
  const autoAdded: string[] = [];
  for (const [word, positions] of Object.entries(revealed)) {
    if (positions.length >= word.length && !found.includes(word)) {
      found.push(word);
      autoAdded.push(word);
      score += 1;
    }
  }
  for (const level of puzzle.levels) {
    if (
      autoAdded.some((w) => w.length === level.size) &&
      level.words.every((w) => found.includes(w))
    ) {
      score += levelBonus(level.size);
    }
  }
  return { found, score };
}

export function usePolygramGame(mode: GameMode) {
  // Daily and archive are the same date-keyed puzzle. The dateKey is
  // FROZEN per mount (PolygramPage/ArchivePlayPage key the component by
  // date and remount on rollover) — it must never drift mid-session.
  const dateKey = mode.kind === "practice" ? "" : mode.dateKey;
  const persisted = mode.kind !== "practice";
  const seed = persisted ? dailySeed(dateKey) : mode.seed;

  // Suspends until the dictionary asset loads (router Suspense boundary).
  const dict = use(loadDictionary());
  const puzzle = useMemo(() => generatePuzzle(dict, seed), [dict, seed]);
  const [state, dispatch] = useReducer(gameReducer, puzzle, initialState);

  // hydratedRef flips only AFTER hydration completes — saving before
  // that would clobber the stored progress with the empty initial state.
  const hydratedRef = useRef(false);
  // Completed before this session → the timer stays frozen.
  const alreadyCompletedRef = useRef(false);
  // Stats already counted (completed earlier OR this is a replay run) →
  // don't record completion again.
  const statsRecordedRef = useRef(false);
  // Play-time tracking: previously saved elapsed + this session's ACTIVE
  // time. The clock pauses while the app is backgrounded.
  const savedElapsedRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const sessionActiveMsRef = useRef(0);
  // Latest state, for saves triggered outside the React render cycle.
  const stateRef = useRef(state);
  stateRef.current = state;

  const currentElapsedMs = () => {
    if (alreadyCompletedRef.current) return savedElapsedRef.current;
    return (
      savedElapsedRef.current +
      sessionActiveMsRef.current +
      (document.hidden ? 0 : Date.now() - sessionStartRef.current)
    );
  };

  // An old-dictionary save is on disk for this date: hold off writing
  // until real progress (a word or a hint), so stray taps can't wipe
  // the historical record.
  const staleRecordRef = useRef(false);
  // A replay reset wipes the save and remounts; the OLD screen's
  // unmount flush must not write the pre-reset state back over it.
  const abandonedRef = useRef(false);
  const persistNow = (s: GameState) => {
    if (!persisted || !hydratedRef.current || abandonedRef.current) return;
    if (
      staleRecordRef.current &&
      s.found.length === 0 &&
      Object.keys(s.revealed).length === 0
    ) {
      return;
    }
    void saveDailyProgress({
      dateKey,
      dictVersion: DICT_VERSION,
      foundWords: s.found,
      revealed: s.revealed,
      score: s.score,
      completed: s.phase === "done",
      elapsedMs: currentElapsedMs(),
      // Preserve the replay marker across saves.
      ...(statsRecordedRef.current && { statsRecorded: true }),
    });
  };

  // Pause the solve clock while backgrounded, and FLUSH a save when the
  // app hides — iOS routinely kills suspended PWAs, and reducer-change
  // saves alone would lose the minutes since the last found word.
  useEffect(() => {
    if (!persisted) return;
    const bank = () => {
      sessionActiveMsRef.current += Date.now() - sessionStartRef.current;
      sessionStartRef.current = Date.now();
    };
    const onVisibility = () => {
      if (document.hidden) {
        bank();
        persistNow(stateRef.current);
      } else {
        sessionStartRef.current = Date.now();
      }
    };
    const onPageHide = () => {
      if (!document.hidden) bank();
      persistNow(stateRef.current);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      // In-app navigation away unmounts without a pagehide — flush the
      // clock here too. (Safe pre-hydration: persistNow no-ops then.)
      if (!document.hidden) bank();
      persistNow(stateRef.current);
    };
    // persistNow/stateRef are stable enough: they close over refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey]);

  // Hydrate from storage once. StrictMode-safe: no run-once ref — the
  // first (cancelled) run applies nothing, the second completes.
  useEffect(() => {
    if (!persisted) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadDailyProgress(dateKey);
        if (cancelled) return;
        if (saved) {
          alreadyCompletedRef.current = saved.completed;
          statsRecordedRef.current =
            saved.completed || saved.statsRecorded === true;
          savedElapsedRef.current = saved.elapsedMs ?? 0;
          sessionStartRef.current = Date.now();
          sessionActiveMsRef.current = 0;
          const revealed = normalizeRevealed(saved.revealed);
          const { found, score } = migrateAutoSubmit(
            puzzle,
            saved.foundWords,
            revealed,
            saved.score,
          );
          dispatch({ type: "hydrate", found, revealed, score });
        } else {
          // A save from an older dictionary is a historical record: the
          // day restarts fresh but was already counted as played (and
          // possibly completed) — don't re-count, and leave the record
          // in place for the archive until play actually begins.
          const stale = await loadStaleDailyProgress(dateKey);
          if (cancelled) return;
          if (stale) {
            staleRecordRef.current = true;
            statsRecordedRef.current =
              stale.completed || stale.statsRecorded === true;
            hydratedRef.current = true;
            return;
          }
          void recordDailyStarted();
          // Write the initial save immediately so re-opening an
          // untouched day never counts as another "play".
          hydratedRef.current = true;
          persistNow(stateRef.current);
          return;
        }
        hydratedRef.current = true;
      } catch (err) {
        // A corrupted save must not wedge the day: start fresh.
        console.warn("hydration failed, starting fresh", err);
        if (!cancelled) hydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, puzzle]);

  // Persist after every meaningful change.
  useEffect(() => {
    persistNow(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, state.found, state.revealed, state.score, state.phase]);

  // Freeze the final solve time the moment the puzzle completes, so the
  // completion screen and share text never show a stale value.
  const [doneElapsedMs, setDoneElapsedMs] = useState<number | null>(null);
  useEffect(() => {
    if (!persisted || state.phase !== "done" || doneElapsedMs !== null) return;
    setDoneElapsedMs(currentElapsedMs());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, state.phase, doneElapsedMs]);

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

  // Stop ALL further persistence for this mount (replay reset).
  const abandonSession = () => {
    abandonedRef.current = true;
  };

  return { state, dispatch, puzzle, doneElapsedMs, abandonSession };
}