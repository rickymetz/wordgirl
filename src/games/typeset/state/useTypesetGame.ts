import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { trackStarted, trackSolved } from "../../../lib/analytics";
import { useDailyClock } from "../../../lib/daily/useDailyClock";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { dailyBoard, practiceBoard, type BoardKind } from "../engine/schedule";
import { TUTORIAL_BOARD } from "../engine/tutorial";
import {
  loadDailyProgress,
  loadStaleDailyProgress,
  recordDailySolved,
  recordDailyStarted,
  saveDailyProgress,
  typesetPuzzleKey,
} from "./persistence";
import { gameReducer, initialState, type GameState } from "./reducer";

export type GameMode =
  | { kind: "daily"; dateKey: string; board: BoardKind }
  | { kind: "archive"; dateKey: string; board: BoardKind }
  | { kind: "practice"; seed: string; board: BoardKind }
  | { kind: "tutorial" };

/** Modes whose progress is written to storage. An allowlist, never `!== "practice"`. */
export function isPersisted(mode: GameMode): boolean {
  return mode.kind === "daily" || mode.kind === "archive";
}

export function boardOf(mode: GameMode): BoardKind {
  return mode.kind === "tutorial" ? "charset" : mode.board;
}

export function useTypesetGame(mode: GameMode) {
  const persisted = isPersisted(mode);
  const dateKey = mode.kind === "daily" || mode.kind === "archive" ? mode.dateKey : "";
  const kind = boardOf(mode);
  const practiceSeed = mode.kind === "practice" ? mode.seed : "";

  const board = useMemo(
    () => (mode.kind === "tutorial" ? TUTORIAL_BOARD : persisted ? dailyBoard(dateKey, kind) : practiceBoard(kind, practiceSeed)),
    [mode.kind, persisted, dateKey, kind, practiceSeed],
  );
  const pKey = useMemo(() => typesetPuzzleKey(board), [board]);
  const [state, dispatch] = useReducer(gameReducer, board, initialState);

  const hydratedRef = useRef(false);
  const alreadySolvedRef = useRef(false);
  const statsRecordedRef = useRef(false);
  const staleRecordRef = useRef(false);
  const abandonedRef = useRef(false);
  const sessionsRef = useRef<number | null>(null);
  const solvedHourRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const clock = useDailyClock({
    flush: () => {
      if (!persisted) return;
      persistNow(stateRef.current);
    },
    resetKey: `${dateKey}:${kind}`,
  });

  /** Saves the board; the promise settles once the write has landed (or at once when nothing is saved). */
  const persistNow = (s: GameState): Promise<unknown> => {
    if (!persisted || !hydratedRef.current || abandonedRef.current) return Promise.resolve();
    if (staleRecordRef.current && s.found.length === 0 && s.misses === 0) return Promise.resolve();
    staleRecordRef.current = false;
    return saveDailyProgress({
      dateKey,
      puzzleKey: pKey,
      board: kind,
      dictVersion: DICT_VERSION,
      found: s.found,
      total: s.board.sets.length,
      misses: s.misses,
      hints: s.hints,
      hintState: s.hintState,
      solved: s.solved,
      elapsedMs: clock.currentElapsedMs(),
      ...(sessionsRef.current !== null && { sessions: sessionsRef.current }),
      ...(solvedHourRef.current !== null && { solvedHour: solvedHourRef.current }),
      ...(statsRecordedRef.current && { statsRecorded: true }),
    });
  };

  useEffect(() => {
    if (!persisted) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadDailyProgress(dateKey, kind, pKey);
        if (cancelled) return;
        if (saved) {
          alreadySolvedRef.current = saved.solved;
          statsRecordedRef.current = saved.solved || saved.statsRecorded === true;
          clock.hydrate(saved.elapsedMs ?? 0, saved.solved);
          sessionsRef.current = saved.sessions === undefined ? null : saved.solved ? saved.sessions : saved.sessions + 1;
          solvedHourRef.current = saved.solvedHour ?? null;
          dispatch({ type: "hydrate", found: saved.found, misses: saved.misses ?? 0, hints: saved.hints ?? 0, hintState: saved.hintState });
          hydratedRef.current = true;
          return;
        }
        const stale = await loadStaleDailyProgress(dateKey, kind, pKey);
        if (cancelled) return;
        if (stale) {
          // The day was already counted under an older derivation: carry
          // the marker, don't count the start again.
          staleRecordRef.current = true;
          statsRecordedRef.current = stale.solved || stale.statsRecorded === true;
          sessionsRef.current = 1;
          hydratedRef.current = true;
          return;
        }
        void recordDailyStarted(dateKey, kind).then((counted) => {
          if (counted) trackStarted("typeset");
        });
        sessionsRef.current = 1;
        hydratedRef.current = true;
        persistNow(stateRef.current);
      } catch (err) {
        console.warn("hydration failed, starting fresh", err);
        if (!cancelled) hydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, kind, board]);

  const solveTrackedRef = useRef(false);
  useEffect(() => {
    if (state.solved && !solveTrackedRef.current && !alreadySolvedRef.current) {
      solveTrackedRef.current = true;
      trackSolved("typeset");
    }
  }, [state.solved]);

  const [solvedElapsedMs, setSolvedElapsedMs] = useState<number | null>(null);
  useEffect(() => {
    if (!persisted || !state.solved) return;
    if (alreadySolvedRef.current) {
      if (solvedElapsedMs === null) setSolvedElapsedMs(clock.currentElapsedMs());
      return;
    }
    if (solvedElapsedMs === null) setSolvedElapsedMs(clock.freeze());
    solvedHourRef.current ??= new Date().getHours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, state.solved, solvedElapsedMs]);

  const recordedRef = useRef(false);
  useEffect(() => {
    if (!persisted || !state.solved) return;
    if (!recordedRef.current && !statsRecordedRef.current) {
      recordedRef.current = true;
      statsRecordedRef.current = true;
      // Stats chain AFTER this board's solved save lands (house rule):
      // the day's hint-free count reads both boards' saved records.
      // Grace day only for the live daily, never an archive play.
      void persistNow(state).then(() => recordDailySolved(dateKey, kind, mode.kind === "daily"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, state.solved]);

  useEffect(() => {
    persistNow(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, state.found, state.misses, state.hints, state.solved]);

  const abandonSession = () => {
    abandonedRef.current = true;
  };

  return {
    state,
    dispatch,
    board,
    pKey,
    clock,
    solvedElapsedMs,
    hydratedAsSolved: alreadySolvedRef.current,
    abandonSession,
  };
}
