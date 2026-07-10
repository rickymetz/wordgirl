import { use, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { loadDictionary } from "../../../lib/words/loader";
import { buildLexicon, commonWords } from "../engine/lexicon";
import { dailySeed, generateBackwords } from "../engine/generator";
import {
  loadDailyProgress,
  loadStaleDailyProgress,
  recordDailySolved,
  recordDailyStarted,
  saveDailyProgress,
} from "./persistence";
import {
  gameReducer,
  glyphRowCount,
  initialState,
  type GameState,
} from "./reducer";

export type GameMode =
  | { kind: "daily"; dateKey: string }
  | { kind: "archive"; dateKey: string }
  | { kind: "practice"; seed: string };

export function useBackwordsGame(mode: GameMode) {
  // The dateKey is FROZEN per mount (pages key the component by date
  // and remount on rollover) — it must never drift mid-session.
  const dateKey = mode.kind === "practice" ? "" : mode.dateKey;
  const persisted = mode.kind !== "practice";
  const seed = persisted ? dailySeed(dateKey) : mode.seed;

  // Suspends until the dictionary asset loads (router Suspense boundary).
  const dict = use(loadDictionary());
  const lexicon = useMemo(() => buildLexicon(dict), [dict]);
  const words = useMemo(() => commonWords(dict), [dict]);
  const puzzle = useMemo(() => generateBackwords(dict, seed), [dict, seed]);
  const [state, rawDispatch] = useReducer(
    gameReducer,
    { puzzle, lexicon, words, isWord: dict.has },
    initialState,
  );
  // This tab committed or broke a row itself: its rows are the truth,
  // and the multi-tab guard lets its writes through.
  const rowsEditedRef = useRef(false);
  // Row edits mark this tab as the owner of its rows.
  const dispatch = (action: Parameters<typeof rawDispatch>[0]) => {
    if (action.type === "commit" || action.type === "breakRow") {
      rowsEditedRef.current = true;
    }
    rawDispatch(action);
  };

  // hydratedRef flips only AFTER hydration completes — saving before
  // that would clobber the stored progress with the empty initial state.
  const hydratedRef = useRef(false);
  // Solved before this session → the clock stays frozen at the save.
  const alreadySolvedRef = useRef(false);
  // Stats already counted (solved earlier OR this is a replay run).
  const statsRecordedRef = useRef(false);
  // Play-time tracking: previously saved elapsed + this session's
  // ACTIVE time. Pauses while backgrounded; frozen at the solve.
  const savedElapsedRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const sessionActiveMsRef = useRef(0);
  const solvedElapsedRef = useRef<number | null>(null);
  // Latest state, for saves triggered outside the React render cycle.
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

  // An old-dictionary save is on disk for this date: hold off writing
  // until real progress, so stray taps can't wipe the historical record.
  // Released after the first real write — rows legitimately return to
  // zero (breakRow), and those empty boards must keep saving.
  const staleRecordRef = useRef(false);
  // A replay reset wipes the save and remounts; the OLD screen's
  // unmount flush must not write the pre-reset state back over it.
  const abandonedRef = useRef(false);
  const persistNow = (s: GameState) => {
    if (!persisted || !hydratedRef.current || abandonedRef.current) return;
    if (staleRecordRef.current) {
      if (s.rows.length === 0 && !s.solved) return;
      staleRecordRef.current = false; // real progress replaced the record
    }
    void saveDailyProgress(
      {
        dateKey,
        dictVersion: DICT_VERSION,
        rows: s.rows.map((r) => r.place),
        solved: s.solved,
        elapsedMs: currentElapsedMs(),
        ...(statsRecordedRef.current && { statsRecorded: true }),
      },
      { rowsEdited: rowsEditedRef.current },
    );
  };

  // Pause the clock while backgrounded, and FLUSH a save when the app
  // hides — iOS routinely kills suspended PWAs. Practice runs the
  // clock too (its time shows at the end); persistNow is a no-op there.
  useEffect(() => {
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
    // persistNow/stateRef are stable enough: they close over refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey]);

  // Hydrate from storage once. StrictMode-safe: the first (cancelled)
  // run applies nothing, the second completes.
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
          dispatch({ type: "hydrate", places: saved.rows, solved: saved.solved });
        } else {
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
        console.warn("hydration failed, starting fresh", err);
        if (!cancelled) hydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, puzzle]);

  // Freeze the clock the moment the board completes, and record the
  // solve exactly once. Declared BEFORE the persist effect so the
  // completing change saves the frozen value.
  const [solvedElapsedMs, setSolvedElapsedMs] = useState<number | null>(null);
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!state.solved) return;
    if (alreadySolvedRef.current) {
      if (solvedElapsedMs === null) setSolvedElapsedMs(savedElapsedRef.current);
      return;
    }
    // The clock freezes at the solve in EVERY mode — practice reveals
    // its time too; only the stats recording is daily/archive-only.
    if (solvedElapsedRef.current === null) {
      solvedElapsedRef.current = rawElapsedMs();
      setSolvedElapsedMs(solvedElapsedRef.current);
    }
    if (persisted && !recordedRef.current && !statsRecordedRef.current) {
      recordedRef.current = true;
      void recordDailySolved(
        dateKey,
        solvedElapsedRef.current,
        glyphRowCount(state.rows),
        mode.kind === "daily",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, state.solved, solvedElapsedMs]);

  // Persist after every meaningful change.
  useEffect(() => {
    persistNow(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, state.rows, state.solved]);

  // Stop ALL further persistence for this mount (replay reset).
  const abandonSession = () => {
    abandonedRef.current = true;
  };

  return { state, dispatch, puzzle, solvedElapsedMs, abandonSession };
}
