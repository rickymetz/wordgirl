import { use, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { loadDictionary } from "../../../lib/words/loader";
import { dailySeed, generateCrosshatch } from "../engine/generator";
import { isSolved, rankFor, uniqueWords } from "../engine/scoring";
import {
  loadDailyProgress,
  loadStaleDailyProgress,
  recordDailySolved,
  recordDailyStarted,
  recordRankImproved,
  saveDailyProgress,
} from "./persistence";
import { gameReducer, initialState, type GameState } from "./reducer";

export type GameMode =
  | { kind: "daily"; dateKey: string }
  | { kind: "archive"; dateKey: string }
  | { kind: "practice"; seed: string };

export function useCrosshatchGame(mode: GameMode) {
  // The dateKey is FROZEN per mount (pages key the component by date and
  // remount on rollover) — it must never drift mid-session.
  const dateKey = mode.kind === "practice" ? "" : mode.dateKey;
  const persisted = mode.kind !== "practice";
  const seed = persisted ? dailySeed(dateKey) : mode.seed;

  // Suspends until the dictionary asset loads (router Suspense boundary).
  const dict = use(loadDictionary());
  const puzzle = useMemo(() => generateCrosshatch(dict, seed), [dict, seed]);
  const totalWords = useMemo(
    () => uniqueWords(puzzle.combos).length,
    [puzzle],
  );
  const [state, dispatch] = useReducer(gameReducer, puzzle, initialState);

  // hydratedRef flips only AFTER hydration completes — saving before
  // that would clobber the stored progress with the empty initial state.
  const hydratedRef = useRef(false);
  // Solved before this session → the clock stays frozen.
  const alreadySolvedRef = useRef(false);
  // Stats already counted (solved earlier OR this is a replay run).
  const statsRecordedRef = useRef(false);
  // Play-time tracking: previously saved elapsed + this session's ACTIVE
  // time. Pauses while backgrounded; freezes at the solve moment.
  const savedElapsedRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const sessionActiveMsRef = useRef(0);
  // The clock value captured when the solve threshold was crossed.
  const solvedElapsedRef = useRef<number | null>(null);
  // Latest state, for saves triggered outside the React render cycle.
  const stateRef = useRef(state);
  stateRef.current = state;

  const currentElapsedMs = () => {
    if (alreadySolvedRef.current) return savedElapsedRef.current;
    if (solvedElapsedRef.current !== null) return solvedElapsedRef.current;
    return (
      savedElapsedRef.current +
      sessionActiveMsRef.current +
      (document.hidden ? 0 : Date.now() - sessionStartRef.current)
    );
  };

  // An old-dictionary save is on disk for this date: hold off writing
  // until real progress (a word or a reveal), so cursor taps and stray
  // keystrokes can't wipe the historical record.
  const staleRecordRef = useRef(false);
  const persistNow = (s: GameState) => {
    if (!persisted || !hydratedRef.current) return;
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
      grid: s.grid,
      revealed: s.revealed,
      totalWords,
      solved: s.solved,
      elapsedMs: currentElapsedMs(),
      // Preserve the replay marker across saves.
      ...(statsRecordedRef.current && { statsRecorded: true }),
    });
  };

  // Pause the solve clock while backgrounded, and FLUSH a save when the
  // app hides — iOS routinely kills suspended PWAs.
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
          alreadySolvedRef.current = saved.solved;
          statsRecordedRef.current =
            saved.solved || saved.statsRecorded === true;
          savedElapsedRef.current = saved.elapsedMs ?? 0;
          sessionStartRef.current = Date.now();
          sessionActiveMsRef.current = 0;
          dispatch({
            type: "hydrate",
            found: saved.foundWords,
            grid: saved.grid ?? {},
            // Older saves predate hints — normalize.
            revealed: saved.revealed ?? {},
            solved: saved.solved,
          });
        } else {
          // A save from an older dictionary is a historical record: the
          // day restarts fresh but was already counted as played — don't
          // re-count, and leave the record in place until play begins.
          const stale = await loadStaleDailyProgress(dateKey);
          if (cancelled) return;
          if (stale) {
            staleRecordRef.current = true;
            statsRecordedRef.current =
              stale.solved || stale.statsRecorded === true;
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
  }, [persisted, dateKey, state.found, state.grid, state.revealed, state.solved]);

  // Freeze the clock the moment the solve threshold is crossed, and
  // expose the frozen value for the results screen and share text.
  const [solvedElapsedMs, setSolvedElapsedMs] = useState<number | null>(null);
  useEffect(() => {
    if (!persisted || !state.solved) return;
    if (solvedElapsedRef.current === null && !alreadySolvedRef.current) {
      solvedElapsedRef.current = currentElapsedMs();
    }
    if (solvedElapsedMs === null) {
      setSolvedElapsedMs(
        alreadySolvedRef.current
          ? savedElapsedRef.current
          : solvedElapsedRef.current,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, state.solved, solvedElapsedMs]);

  // Record the solve (stats; streak only if it's today) exactly once,
  // and upgrade bestRank if the player pushes on to a perfect sweep.
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!persisted) return;
    const total = totalWords;
    if (
      state.solved &&
      !recordedRef.current &&
      !statsRecordedRef.current &&
      isSolved(state.found.length, total)
    ) {
      recordedRef.current = true;
      void recordDailySolved(
        dateKey,
        state.found.length,
        rankFor(state.found.length, total),
      );
    }
    if (state.found.length === total && total > 0) {
      void recordRankImproved(rankFor(total, total));
    }
  }, [persisted, dateKey, state.solved, state.found, puzzle, totalWords]);

  return { state, dispatch, puzzle, totalWords, solvedElapsedMs };
}
