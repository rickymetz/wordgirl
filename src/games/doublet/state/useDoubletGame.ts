import { use, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { loadDictionary } from "../../../lib/words/loader";
import { dailySeed, generateDoublet } from "../engine/generator";
import type { Difficulty } from "../engine/types";
import {
  loadDailyProgress,
  loadStaleDailyProgress,
  recordDailySolved,
  recordDailyStarted,
  saveDailyProgress,
} from "./persistence";
import { gameReducer, initialState, type GameState } from "./reducer";

export type GameMode =
  | { kind: "daily"; dateKey: string; difficulty: Difficulty }
  | { kind: "archive"; dateKey: string; difficulty: Difficulty }
  | { kind: "practice"; seed: string; difficulty: Difficulty };

export function useDoubletGame(mode: GameMode) {
  const dateKey = mode.kind === "practice" ? "" : mode.dateKey;
  const persisted = mode.kind !== "practice";
  const seed = persisted
    ? dailySeed(dateKey, mode.difficulty)
    : mode.seed;

  const dict = use(loadDictionary());
  const puzzle = useMemo(() => generateDoublet(dict, seed), [dict, seed]);
  const [state, dispatch] = useReducer(gameReducer, puzzle, initialState);

  const hydratedRef = useRef(false);
  const alreadySolvedRef = useRef(false);
  const statsRecordedRef = useRef(false);
  const savedElapsedRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const sessionActiveMsRef = useRef(0);
  const solvedElapsedRef = useRef<number | null>(null);
  const staleRecordRef = useRef(false);
  const abandonedRef = useRef(false);
  // Opens of this board while unsolved; null = unknowable (solved
  // before the counter shipped — never backfill).
  const sessionsRef = useRef<number | null>(null);
  // Local hour this board was solved, stamped ONLY for a solve that
  // happens in this session.
  const solvedHourRef = useRef<number | null>(null);
  // False when this board hydrated from a save that predates the
  // action counters: the true counts are unknowable, so they must
  // never be written — re-saving zeros would turn the legacy day's
  // GAP into a fake best-ever 0 on the trends charts.
  const countersKnownRef = useRef(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  const rawElapsedMs = () =>
    savedElapsedRef.current +
    sessionActiveMsRef.current +
    (document.hidden ? 0 : Date.now() - sessionStartRef.current);

  const currentElapsedMs = () => {
    if (alreadySolvedRef.current) return savedElapsedRef.current;
    if (solvedElapsedRef.current !== null) return solvedElapsedRef.current;
    return rawElapsedMs();
  };

  const persistNow = (s: GameState) => {
    if (!persisted || !hydratedRef.current || abandonedRef.current) return;
    if (staleRecordRef.current && s.placed.length === 0) return;
    staleRecordRef.current = false;

    void saveDailyProgress({
      dateKey,
      difficulty: mode.difficulty,
      dictVersion: DICT_VERSION,
      placed: s.placed,
      solved: s.solved,
      elapsedMs: currentElapsedMs(),
      ...(countersKnownRef.current && {
        moves: s.moves,
        rotations: s.rotations,
        removals: s.removals,
        invalidBoards: s.invalidBoards,
      }),
      ...(sessionsRef.current !== null && { sessions: sessionsRef.current }),
      ...(solvedHourRef.current !== null && {
        solvedHour: solvedHourRef.current,
      }),
      foundWords: [],
      ...(statsRecordedRef.current && { statsRecorded: true }),
    });
  };

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
      if (!document.hidden) bank();
      persistNow(stateRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, mode.difficulty]);

  useEffect(() => {
    if (!persisted) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadDailyProgress(dateKey, mode.difficulty);
        if (cancelled) return;
        if (saved) {
          alreadySolvedRef.current = saved.solved;
          statsRecordedRef.current =
            saved.solved || saved.statsRecorded === true;
          savedElapsedRef.current = saved.elapsedMs ?? 0;
          sessionStartRef.current = Date.now();
          sessionActiveMsRef.current = 0;
          // A pre-tracking save's session count is unknowable — stays
          // null even if play continues (a partial count is as fake
          // as a zero). A solved board's count is final; an unsolved
          // one counts this open as another session.
          sessionsRef.current =
            saved.sessions === undefined
              ? null
              : saved.solved
                ? saved.sessions
                : saved.sessions + 1;
          solvedHourRef.current = saved.solvedHour ?? null;
          countersKnownRef.current = saved.moves !== undefined;
          dispatch({
            type: "hydrate",
            placed: saved.placed,
            solved: saved.solved,
            moves: saved.moves,
            rotations: saved.rotations,
            removals: saved.removals,
            invalidBoards: saved.invalidBoards,
          });
        } else {
          const stale = await loadStaleDailyProgress(dateKey, mode.difficulty);
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
          hydratedRef.current = true;
          persistNow(stateRef.current);
          return;
        }
        hydratedRef.current = true;
      } catch (err) {
        console.warn("hydration failed, starting fresh", err);
        if (!cancelled) hydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, mode.difficulty, puzzle]);

  const [solvedElapsedMs, setSolvedElapsedMs] = useState<number | null>(null);
  useEffect(() => {
    if (!persisted || !state.solved) return;
    if (alreadySolvedRef.current) {
      if (solvedElapsedMs === null) setSolvedElapsedMs(savedElapsedRef.current);
      return;
    }
    if (solvedElapsedRef.current === null) {
      solvedElapsedRef.current = rawElapsedMs();
      setSolvedElapsedMs(solvedElapsedRef.current);
    }
    // Stamp the hour only for a solve that happened THIS session —
    // runs before the persist effect, so the solving save carries it.
    solvedHourRef.current ??= new Date().getHours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, state.solved, solvedElapsedMs]);

  const recordedRef = useRef(false);
  useEffect(() => {
    if (!persisted || !state.solved) return;
    if (!recordedRef.current && !statsRecordedRef.current) {
      recordedRef.current = true;
      statsRecordedRef.current = true;
      void recordDailySolved(dateKey, mode.kind === "daily");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, state.solved]);

  useEffect(() => {
    persistNow(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, state.placed, state.solved]);

  const abandonSession = () => {
    abandonedRef.current = true;
  };

  return { state, dispatch, puzzle, dict, solvedElapsedMs, abandonSession };
}
