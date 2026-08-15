import { use, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { trackStarted, trackSolved } from "../../../lib/analytics";
import { useDailyClock } from "../../../lib/daily/useDailyClock";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { loadDictionary } from "../../../lib/words/loader";
import { dailySeed, generateDoublet } from "../engine/generator";
import { TUTORIAL_PUZZLE } from "../engine/tutorial";
import type { Difficulty } from "../engine/types";
import {
  doubletPuzzleKey,
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
  | { kind: "practice"; seed: string; difficulty: Difficulty }
  | { kind: "tutorial"; difficulty: Difficulty };

/** Modes whose progress is written to storage — see `persisted` below. */
function isPersisted(mode: GameMode): boolean {
  return mode.kind === "daily" || mode.kind === "archive";
}

export function useDoubletGame(mode: GameMode) {
  const persisted = isPersisted(mode);
  const dateKey =
    mode.kind === "daily" || mode.kind === "archive" ? mode.dateKey : "";
  const seed = persisted
    ? dailySeed(dateKey, mode.difficulty)
    : mode.kind === "practice"
      ? mode.seed
      : TUTORIAL_PUZZLE.seed;

  const dict = use(loadDictionary());
  const puzzle = useMemo(
    () =>
      mode.kind === "tutorial"
        ? TUTORIAL_PUZZLE
        : generateDoublet(dict, seed),
    [dict, seed, mode.kind],
  );
  const pKey = useMemo(() => doubletPuzzleKey(puzzle), [puzzle]);
  const [state, dispatch] = useReducer(gameReducer, puzzle, initialState);

  const hydratedRef = useRef(false);
  const alreadySolvedRef = useRef(false);
  const statsRecordedRef = useRef(false);
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

  const clock = useDailyClock({
    flush: () => {
      if (!persisted) return;
      persistNow(stateRef.current);
    },
    resetKey: `${dateKey}:${mode.difficulty}`,
  });

  const persistNow = (s: GameState) => {
    if (!persisted || !hydratedRef.current || abandonedRef.current) return;
    if (staleRecordRef.current && s.placed.length === 0) return;
    staleRecordRef.current = false;

    void saveDailyProgress({
      dateKey,
      puzzleKey: pKey,
      difficulty: mode.difficulty,
      dictVersion: DICT_VERSION,
      placed: s.placed,
      solved: s.solved,
      elapsedMs: clock.currentElapsedMs(),
      ...(countersKnownRef.current && {
        moves: s.moves,
        rotations: s.rotations,
        removals: s.removals,
        invalidBoards: s.invalidBoards,
        hints: s.hints,
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
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadDailyProgress(dateKey, mode.difficulty, pKey);
        if (cancelled) return;
        if (saved) {
          alreadySolvedRef.current = saved.solved;
          statsRecordedRef.current =
            saved.solved || saved.statsRecorded === true;
          clock.hydrate(saved.elapsedMs ?? 0, saved.solved);
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
            dict,
            moves: saved.moves,
            rotations: saved.rotations,
            removals: saved.removals,
            invalidBoards: saved.invalidBoards,
            hints: saved.hints,
          });
        } else {
          const stale = await loadStaleDailyProgress(dateKey, mode.difficulty, pKey);
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
          trackStarted("doublet");
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

  // Track analytics solve event (all modes, once per session).
  const solveTrackedRef = useRef(false);
  useEffect(() => {
    if (state.solved && !solveTrackedRef.current && !alreadySolvedRef.current) {
      solveTrackedRef.current = true;
      trackSolved("doublet");
    }
  }, [state.solved]);

  const [solvedElapsedMs, setSolvedElapsedMs] = useState<number | null>(null);
  useEffect(() => {
    if (!persisted || !state.solved) return;
    if (alreadySolvedRef.current) {
      if (solvedElapsedMs === null) setSolvedElapsedMs(clock.currentElapsedMs());
      return;
    }
    if (solvedElapsedMs === null) {
      setSolvedElapsedMs(clock.freeze());
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
      void recordDailySolved(dateKey, mode.difficulty, mode.kind === "daily");
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

  return { state, dispatch, puzzle, dict, solvedElapsedMs, hydratedAsSolved: alreadySolvedRef.current, abandonSession };
}
