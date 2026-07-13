import { use, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { trackSolved } from "../../../lib/analytics";
import { useDailyClock } from "../../../lib/daily/useDailyClock";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { loadDictionary } from "../../../lib/words/loader";
import { dailySeed, generateCrosshatch } from "../engine/generator";
import { isSolved, uniqueWords } from "../engine/scoring";
import {
  loadDailyProgress,
  loadStaleDailyProgress,
  recordDailySolved,
  recordDailyStarted,
  recordWordsProgress,
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
  // Words already credited to stats.totalWords for this day.
  const creditedRef = useRef(0);
  // Latest state, for saves triggered outside the React render cycle.
  const stateRef = useRef(state);
  stateRef.current = state;

  // An old-dictionary save is on disk for this date: hold off writing
  // until real progress (a word or a reveal), so cursor taps and stray
  // keystrokes can't wipe the historical record.
  const staleRecordRef = useRef(false);
  // A replay reset wipes the save and remounts; the OLD screen's
  // unmount flush must not write the pre-reset state back over it.
  const abandonedRef = useRef(false);
  // Opens of this day while unsolved ("sessions to solve"); null =
  // unknowable (solved before the counter shipped — never backfill).
  const sessionsRef = useRef<number | null>(null);
  // Local hour the solve landed, stamped ONLY for a solve that happens
  // in this session.
  const solvedHourRef = useRef<number | null>(null);
  // False when this day hydrated from a save that predates the
  // invalids counter: the true count is unknowable, so it must never
  // be written — re-saving a zero would turn the legacy day's GAP
  // into a fake best-ever 0 on the trends charts.
  const countersKnownRef = useRef(true);
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
      grid: s.grid,
      revealed: s.revealed,
      totalWords,
      solved: s.solved,
      elapsedMs: clock.currentElapsedMs(),
      statsWords: creditedRef.current,
      ...(countersKnownRef.current && { invalids: s.invalids }),
      ...(sessionsRef.current !== null && { sessions: sessionsRef.current }),
      ...(solvedHourRef.current !== null && {
        solvedHour: solvedHourRef.current,
      }),
      // Preserve the replay marker across saves.
      ...(statsRecordedRef.current && { statsRecorded: true }),
    });
  };

  const clock = useDailyClock({
    flush: () => {
      if (!persisted) return;
      persistNow(stateRef.current);
    },
    resetKey: dateKey,
  });

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
          // Pre-statsWords saves: assume the solve credited everything
          // found so far (the old behavior) rather than re-crediting.
          creditedRef.current = saved.solved
            ? (saved.statsWords ?? saved.foundWords.length)
            : (saved.statsWords ?? 0);
          clock.hydrate(saved.elapsedMs ?? 0, saved.solved);
          // A pre-tracking save's session count is unknowable — stays
          // null even if play continues (a partial count is as fake
          // as a zero). A solved day's count is final; an unsolved
          // one counts this open as another session.
          sessionsRef.current =
            saved.sessions === undefined
              ? null
              : saved.solved
                ? saved.sessions
                : saved.sessions + 1;
          solvedHourRef.current = saved.solvedHour ?? null;
          countersKnownRef.current = saved.invalids !== undefined;
          dispatch({
            type: "hydrate",
            found: saved.foundWords,
            grid: saved.grid ?? {},
            // Older saves predate hints — normalize.
            revealed: saved.revealed ?? {},
            solved: saved.solved,
            invalids: saved.invalids,
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
            // A fresh run replaces the stale record when play begins.
            sessionsRef.current = 1;
            hydratedRef.current = true;
            return;
          }
          void recordDailyStarted();
          sessionsRef.current = 1;
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

  // Freeze the clock when the solve threshold is crossed, then RE-STAMP
  // it on each word banked after that — the recorded time is "when the
  // last word was found", so pushing on to the full sweep counts but
  // idling on the results screen never does. Declared BEFORE the persist
  // effect so a banked word saves the freshly stamped time.
  const [solvedElapsedMs, setSolvedElapsedMs] = useState<number | null>(null);
  const clockFoundRef = useRef(0);
  useEffect(() => {
    if (!persisted || !state.solved) return;
    if (alreadySolvedRef.current) {
      // Solved in an earlier session: the saved time stands.
      if (solvedElapsedMs === null) setSolvedElapsedMs(clock.currentElapsedMs());
      return;
    }
    if (
      solvedElapsedMs === null ||
      state.found.length > clockFoundRef.current
    ) {
      const t = solvedElapsedMs === null ? clock.freeze() : clock.rawElapsedMs();
      clockFoundRef.current = state.found.length;
      setSolvedElapsedMs(t);
    }
    // Stamp the hour only for a solve that happened THIS session —
    // runs before the persist effect, so the solving save carries it.
    solvedHourRef.current ??= new Date().getHours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, state.solved, state.found, solvedElapsedMs]);

  // Track analytics solve event (all modes, once per session).
  const solveTrackedRef = useRef(false);
  useEffect(() => {
    if (state.solved && !solveTrackedRef.current && !alreadySolvedRef.current) {
      solveTrackedRef.current = true;
      trackSolved("crosshatch");
    }
  }, [state.solved]);

  // Record the solve (stats; streak only if it's today) exactly once,
  // then keep crediting words found AFTER the solve — a 12/14 finish
  // must not freeze the lifetime totals and best rank at 9/14. Runs
  // BEFORE the persist effect so each save carries the up-to-date
  // credit count (a lagging statsWords would double-credit on reload).
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!persisted || !state.solved) return;
    const total = totalWords;
    if (
      !recordedRef.current &&
      !statsRecordedRef.current &&
      isSolved(state.found.length, total)
    ) {
      recordedRef.current = true;
      creditedRef.current = state.found.length;
      void recordDailySolved(
        dateKey,
        state.found.length,
        mode.kind === "daily",
      );
      return;
    }
    // Post-solve progress: replays (statsRecorded without a solve on
    // record) never re-credit; genuine solved days always do.
    if (!recordedRef.current && !alreadySolvedRef.current) return;
    if (state.found.length > creditedRef.current) {
      const delta = state.found.length - creditedRef.current;
      creditedRef.current = state.found.length;
      void recordWordsProgress(delta);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, state.solved, state.found, totalWords]);

  // Persist after every meaningful change.
  useEffect(() => {
    persistNow(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, state.found, state.grid, state.revealed, state.solved]);

  // Stop ALL further persistence for this mount (replay reset).
  const abandonSession = () => {
    abandonedRef.current = true;
  };

  return { state, dispatch, puzzle, totalWords, solvedElapsedMs, hydratedAsSolved: alreadySolvedRef.current, abandonSession };
}
