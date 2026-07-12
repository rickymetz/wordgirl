import {
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { loadDictionary } from "../../../lib/words/loader";
import { useDailyClock } from "../../../lib/daily/useDailyClock";
import { buildLexicon, commonWords, lexiconItems } from "../engine/lexicon";
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
  rowSaveKey,
  type Action,
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
  const items = useMemo(() => lexiconItems(lexicon), [lexicon]);
  const puzzle = useMemo(
    () => generateBackwords(dict, seed, items),
    [dict, seed, items],
  );
  const [state, rawDispatch] = useReducer(
    gameReducer,
    { puzzle, lexicon, words, isWord: dict.has },
    initialState,
  );
  // This tab changed its OWN rows: its rows are the truth, and the
  // multi-tab guard lets its writes through. Ownership is derived from
  // the actual rows transition below (a failed commit claims nothing);
  // the wrapper only records which action caused it, so hydration —
  // which replays the SAVED rows — never claims ownership.
  const rowsEditedRef = useRef(false);
  const lastActionRef = useRef<Action["type"] | null>(null);
  const dispatch = useCallback((action: Action) => {
    lastActionRef.current = action.type;
    rawDispatch(action);
  }, []);
  // Invalid commits change counters without touching rows — they're
  // edits too, or a counting tab would never own its own save.
  const prevEditRef = useRef({ rows: state.rows, invalids: state.invalids });
  useEffect(() => {
    const prev = prevEditRef.current;
    if (state.rows !== prev.rows || state.invalids !== prev.invalids) {
      prevEditRef.current = { rows: state.rows, invalids: state.invalids };
      if (lastActionRef.current !== "hydrate") rowsEditedRef.current = true;
    }
  }, [state.rows, state.invalids]);

  // hydratedRef flips only AFTER hydration completes — saving before
  // that would clobber the stored progress with the empty initial state.
  const hydratedRef = useRef(false);
  // Stats already counted (solved earlier OR this is a replay run).
  const statsRecordedRef = useRef(false);
  // Latest state, for saves triggered outside the React render cycle.
  const stateRef = useRef(state);
  stateRef.current = state;

  // The shared active-time clock: pauses while backgrounded, flushes
  // a save on hide/pagehide/unmount, freezes at the solve. Practice
  // runs it too (its time shows at the end); persistNow gates itself.
  const persistRef = useRef<() => void>(() => {});
  const clock = useDailyClock({
    flush: () => persistRef.current(),
    resetKey: dateKey,
  });

  // An old-dictionary save is on disk for this date: hold off writing
  // until real progress, so stray taps can't wipe the historical record.
  // Released after the first real write — rows legitimately return to
  // zero (breakRow), and those empty boards must keep saving.
  const staleRecordRef = useRef(false);
  // A replay reset wipes the save and remounts; the OLD screen's
  // unmount flush must not write the pre-reset state back over it.
  const abandonedRef = useRef(false);
  // Opens of this day while unsolved ("sessions to solve"): resumes
  // from the save and counts this mount; null = unknowable (a legacy
  // day solved before the counter shipped must not chart).
  const sessionsRef = useRef<number | null>(null);
  // Local hour the solve landed, stamped ONLY for a solve that happens
  // in this session — never backfilled onto an already-solved hydrate.
  const solvedHourRef = useRef<number | null>(null);
  const hydratedSolvedRef = useRef(false);
  // False when this day hydrated from a save that predates the action
  // counters: the true counts are unknowable, so the counters must
  // never be written — re-saving zeros would turn the legacy day's
  // GAP into a fake best-ever 0 on the trends charts.
  const countersKnownRef = useRef(true);
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
        // rowSaveKey, not place: a palindrome's bare half is ambiguous
        // (a POOP row saved as "po" would reload as POP).
        rows: s.rows.map(rowSaveKey),
        solved: s.solved,
        elapsedMs: clock.currentElapsedMs(),
        ...(countersKnownRef.current && {
          takeBacks: s.takeBacks,
          invalids: s.invalids,
          hints: s.hints,
        }),
        glyphRows: glyphRowCount(s.rows),
        ...(sessionsRef.current !== null && { sessions: sessionsRef.current }),
        ...(solvedHourRef.current !== null && {
          solvedHour: solvedHourRef.current,
        }),
        ...(statsRecordedRef.current && { statsRecorded: true }),
      },
      { rowsEdited: rowsEditedRef.current },
    );
  };

  persistRef.current = () => persistNow(stateRef.current);

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
          statsRecordedRef.current =
            saved.solved || saved.statsRecorded === true;
          hydratedSolvedRef.current = saved.solved;
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
          countersKnownRef.current = saved.takeBacks !== undefined;
          clock.hydrate(saved.elapsedMs ?? 0, saved.solved);
          dispatch({
            type: "hydrate",
            places: saved.rows,
            solved: saved.solved,
            takeBacks: saved.takeBacks,
            invalids: saved.invalids,
            hints: saved.hints,
          });
        } else {
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
    // The clock freezes at the solve in EVERY mode — practice reveals
    // its time too; only the stats recording is daily/archive-only.
    const ms = clock.freeze();
    if (solvedElapsedMs === null) setSolvedElapsedMs(ms);
    // Stamp the hour only for a solve that happened THIS session —
    // runs before the persist effect, so the solving save carries it.
    if (!hydratedSolvedRef.current && solvedHourRef.current === null) {
      solvedHourRef.current = new Date().getHours();
    }
    if (persisted && !recordedRef.current && !statsRecordedRef.current) {
      recordedRef.current = true;
      void recordDailySolved(
        dateKey,
        ms,
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

  return { state, dispatch, puzzle, solvedElapsedMs, hydratedAsSolved: hydratedSolvedRef.current, abandonSession };
}
