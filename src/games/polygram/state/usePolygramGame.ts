import { use, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  trackBonusWord,
  trackSolved,
  trackStarted,
  trackSwept,
} from "../../../lib/analytics";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { useDailyClock } from "../../../lib/daily/useDailyClock";
import { dailySeed, generatePuzzle } from "../engine/generator";
import { TUTORIAL_PUZZLE } from "../engine/tutorial";
import {
  loadDailyProgress,
  loadStaleDailyProgress,
  polygramPuzzleKey,
  recordDailyCompleted,
  recordDailyStarted,
  saveDailyProgress,
} from "./persistence";
import { loadDictionary } from "../../../lib/words/loader";
import { gameReducer, initialState, type GameState } from "./reducer";

export type GameMode =
  | { kind: "daily"; dateKey: string }
  | { kind: "archive"; dateKey: string }
  | { kind: "practice"; seed: string }
  | { kind: "tutorial" };

/** Modes whose progress is written to storage — see `persisted` below. */
function isPersisted(mode: GameMode): boolean {
  return mode.kind === "daily" || mode.kind === "archive";
}

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
 * never typed — count them as found.
 */
function migrateAutoSubmit(
  foundWords: string[],
  revealed: Record<string, number[]>,
): string[] {
  const found = [...foundWords];
  for (const [word, positions] of Object.entries(revealed)) {
    if (positions.length >= word.length && !found.includes(word)) {
      found.push(word);
    }
  }
  return found;
}

export function usePolygramGame(mode: GameMode) {
  // Daily and archive are the same date-keyed puzzle. The dateKey is
  // FROZEN per mount (PolygramPage/ArchivePlayPage key the component by
  // date and remount on rollover) — it must never drift mid-session.
  const persisted = isPersisted(mode);
  const dateKey =
    mode.kind === "daily" || mode.kind === "archive" ? mode.dateKey : "";
  const seed = persisted
    ? dailySeed(dateKey)
    : mode.kind === "practice"
      ? mode.seed
      : TUTORIAL_PUZZLE.seed;

  // Suspends until the dictionary asset loads (router Suspense boundary).
  // The tutorial's puzzle is hand-written and needs no dictionary, but the
  // call has to stay unconditional — and the asset is precached anyway.
  const dict = use(loadDictionary());
  const puzzle = useMemo(
    () =>
      mode.kind === "tutorial"
        ? TUTORIAL_PUZZLE
        : generatePuzzle(dict, seed),
    [dict, seed, mode.kind],
  );
  const pKey = useMemo(() => polygramPuzzleKey(puzzle), [puzzle]);
  const [state, dispatch] = useReducer(gameReducer, puzzle, initialState);

  // hydratedRef flips only AFTER hydration completes — saving before
  // that would clobber the stored progress with the empty initial state.
  const hydratedRef = useRef(false);
  const hydratedAsSolvedRef = useRef(false);
  // Stats already counted (completed earlier OR this is a replay run) →
  // don't record completion again.
  const statsRecordedRef = useRef(false);
  const solvedHourRef = useRef<number | null>(null);
  // Opens of this day while unfinished ("sessions to finish"); null =
  // unknowable (banked before the counter shipped — never backfill).
  const sessionsRef = useRef<number | null>(null);
  // Latest state, for saves triggered outside the React render cycle.
  const stateRef = useRef(state);
  stateRef.current = state;

  const clock = useDailyClock({
    flush: () => {
      if (!persisted) return;
      persistNow(stateRef.current);
    },
    resetKey: dateKey,
  });

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
      puzzleKey: pKey,
      foundWords: s.found,
      revealed: s.revealed,
      skippedLevels: s.skippedLevels,
      completed: s.phase === "done",
      solved: s.phase === "done",
      elapsedMs: clock.currentElapsedMs(),
      ...(solvedHourRef.current !== null && {
        solvedHour: solvedHourRef.current,
      }),
      ...(sessionsRef.current !== null && { sessions: sessionsRef.current }),
      // The day's ceiling, so Stats can say what share of it was swept.
      totalWords: puzzle.totalWords,
      // Preserve the replay marker across saves.
      ...(statsRecordedRef.current && { statsRecorded: true }),
    });
  };

  // Hydrate from storage once. StrictMode-safe: no run-once ref — the
  // first (cancelled) run applies nothing, the second completes.
  useEffect(() => {
    if (!persisted) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadDailyProgress(dateKey, pKey);
        if (cancelled) return;
        if (saved) {
          statsRecordedRef.current =
            saved.completed || saved.statsRecorded === true;
          clock.hydrate(saved.elapsedMs ?? 0, saved.completed);
          if (saved.completed) hydratedAsSolvedRef.current = true;
          solvedHourRef.current = saved.solvedHour ?? null;
          sessionsRef.current =
            saved.sessions === undefined
              ? null
              : saved.completed
                ? saved.sessions
                : saved.sessions + 1;
          const revealed = normalizeRevealed(saved.revealed);
          dispatch({
            type: "hydrate",
            found: migrateAutoSubmit(saved.foundWords, revealed),
            revealed,
            skippedLevels: saved.skippedLevels ?? [],
          });
        } else {
          // A save from an older dictionary is a historical record: the
          // day restarts fresh but was already counted as played (and
          // possibly completed) — don't re-count, and leave the record
          // in place for the archive until play actually begins.
          const stale = await loadStaleDailyProgress(dateKey, pKey);
          if (cancelled) return;
          if (stale) {
            staleRecordRef.current = true;
            statsRecordedRef.current =
              stale.completed || stale.statsRecorded === true;
            // A fresh run replaces the stale record when play begins.
            sessionsRef.current = 1;
            hydratedRef.current = true;
            return;
          }
          void recordDailyStarted();
          trackStarted("polygram");
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

  // Freeze the clock the moment the puzzle completes — the results
  // screen, share text, AND the persisted save must all show the time
  // of the finish, not the finish plus idle time on the overlay.
  // Declared BEFORE the persist effect so the completing change saves
  // the frozen value.
  const [doneElapsedMs, setDoneElapsedMs] = useState<number | null>(null);
  useEffect(() => {
    if (!persisted || state.phase !== "done") return;
    if (doneElapsedMs === null) {
      setDoneElapsedMs(clock.freeze());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, state.phase, doneElapsedMs]);

  // Persist after every meaningful change.
  useEffect(() => {
    persistNow(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, state.found, state.revealed, state.phase, state.skippedLevels]);

  // Track analytics solve event (all modes, once per session). A board
  // finished having found every word it held — bonus tier included — is
  // the completionist ceiling, and worth counting apart from a solve.
  // NOT from the tutorial, whose hand-picked puzzle has no bonus tier at
  // all: finishing it is a full sweep by construction, so counting it
  // would report the ceiling being reached every time anyone was taught
  // the game.
  const solveTrackedRef = useRef(false);
  useEffect(() => {
    if (state.phase === "done" && !solveTrackedRef.current && !hydratedAsSolvedRef.current) {
      solveTrackedRef.current = true;
      trackSolved("polygram");
      if (mode.kind !== "tutorial" && state.found.length >= puzzle.totalWords) {
        trackSwept("polygram");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  /**
   * A bonus word landed. Reads `lastResult`, which only a live submit
   * sets — hydration clears it — so reopening a solved day cannot
   * re-count the words it was finished with.
   */
  useEffect(() => {
    const r = state.lastResult;
    if (r?.type === "correct" && r.bonus) trackBonusWord("polygram");
  }, [state.lastResult]);

  /**
   * The local hour the day was finished. `??=` so a day reopened later
   * keeps the hour it was actually solved at, and only a solve that
   * happened in THIS session stamps one — a day restored from storage
   * sets the ref from the save instead (see hydration), so re-opening an
   * old day at breakfast cannot move it there.
   *
   * Runs before the persist effect below, so the finishing save carries it.
   */
  useEffect(() => {
    if (state.phase !== "done" || hydratedAsSolvedRef.current) return;
    solvedHourRef.current ??= new Date().getHours();
  }, [state.phase]);

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
    void recordDailyCompleted(
      dateKey,
      state.found.length,
      mode.kind === "daily",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, dateKey, state.phase, state.found, puzzle]);

  // Stop ALL further persistence for this mount (replay reset).
  const abandonSession = () => {
    abandonedRef.current = true;
  };

  return { state, dispatch, puzzle, doneElapsedMs, hydratedAsSolved: hydratedAsSolvedRef.current, abandonSession };
}