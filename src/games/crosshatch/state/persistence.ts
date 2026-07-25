import {
  createDailyPersistence,
  displayStreak,
  streakAdvance,
} from "../../../lib/daily/persistence";
import { puzzleKey as makePuzzleKey } from "../../../lib/puzzleKey";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import type { CrosshatchPuzzle } from "../engine/types";

export interface DailyProgress {
  dateKey: string;
  dictVersion: number;
  /** Deterministic fingerprint of the puzzle — survives unrelated
   * DICT_VERSION bumps. Legacy saves lack this field. */
  puzzleKey?: string;
  /** Distinct words banked so far, in the order they were found. */
  foundWords: string[];
  /** Player-typed letters still on the grid, cell key -> letter. */
  grid: Record<string, string>;
  /** Hint reveals: word -> revealed letter positions. */
  revealed: Record<string, number[]>;
  /** The day's distinct-word total, stored so the archive can rank
   * without regenerating the puzzle. */
  totalWords?: number;
  /** All words found. */
  solved: boolean;
  /** Wall-clock play time across sessions, frozen at the solve moment. */
  elapsedMs: number;
  /**
   * Set when this date's solve already counted toward stats — a replay
   * must not increment totals again.
   */
  statsRecorded?: boolean;
  /** Words already credited to stats.totalWords, so post-solve finds
   * keep counting exactly once across sessions. */
  statsWords?: number;
  /** Trend counters, absent on saves from before they shipped
   * (legacy days chart as gaps, never fake zeros). */
  sessions?: number;
  invalids?: number;
  /** Local hour (0-23) the solve threshold was crossed. */
  solvedHour?: number;
}

export interface CrosshatchStats {
  played: number;
  solved: number;
  currentStreak: number;
  bestStreak: number;
  lastSolvedDate: string | null;
  bestRank: string | null;
  totalWords: number;
}

const EMPTY_STATS: CrosshatchStats = {
  played: 0,
  solved: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastSolvedDate: null,
  bestRank: null,
  totalWords: 0,
};

const base = createDailyPersistence<DailyProgress, CrosshatchStats>({
  gameId: "crosshatch",
  emptyStats: EMPTY_STATS,
  validDay: (s) =>
    Array.isArray(s.foundWords) &&
    s.grid !== null &&
    typeof s.grid === "object" &&
    (s.revealed === undefined ||
      (s.revealed !== null && typeof s.revealed === "object")),
  // Found words only ever GROW within a day: a stored save holding
  // words this tab doesn't know about means another tab is ahead. The
  // counters ride the same save and are monotonic too — a tab with a
  // stale (smaller) count must not regress a fresher one.
  allowUnsolvedWrite: (stored, progress) =>
    !(
      stored.foundWords.length > progress.foundWords.length &&
      stored.foundWords.some((w) => !progress.foundWords.includes(w))
    ) &&
    (progress.invalids ?? 0) >= (stored.invalids ?? 0) &&
    (progress.sessions ?? 0) >= (stored.sessions ?? 0),
});
const store = base.store;

export function crosshatchPuzzleKey(puzzle: CrosshatchPuzzle): string {
  return makePuzzleKey([puzzle.givens, puzzle.combos]);
}

/** The first daily puzzle — the archive reaches back to here. */
export const ARCHIVE_EPOCH = "2026-07-06";

/**
 * DICT_VERSION at which crosshatch's own puzzle derivation last
 * changed (v17: generate from the required tier). Every save below it
 * describes a puzzle that no longer exists for its date. The archive
 * listing can't detect that from `puzzleKey` — it would have to
 * regenerate all 200+ puzzles to compare — so the version is the
 * marker. Raise this ONLY when crosshatch generation itself changes;
 * an unrelated game's bump must keep resolving through puzzleKey.
 */
const GENERATOR_VERSION = 17;

function validShape(saved: DailyProgress | null): DailyProgress | null {
  return base.validShape(saved);
}

/**
 * The playable save for a date, or null. Saves whose puzzle no longer
 * matches can't be resumed — use loadStaleDailyProgress for historical
 * records. Pass `currentPuzzleKey` so an unrelated DICT_VERSION bump
 * doesn't discard progress when the crosshatch puzzle is unchanged.
 */
export function loadDailyProgress(
  dateKey: string,
  currentPuzzleKey?: string,
): Promise<DailyProgress | null> {
  return base.loadDay(dateKey, currentPuzzleKey);
}

/** A save from an older/different puzzle, kept as a historical record. */
export function loadStaleDailyProgress(
  dateKey: string,
  currentPuzzleKey?: string,
): Promise<DailyProgress | null> {
  return base.loadStaleDay(dateKey, currentPuzzleKey);
}

export interface ArchivedDay extends DailyProgress {
  /** True when the save's provenance is unverifiable — a legacy record
   * with no puzzleKey, written against an older dictionary. Values
   * derived from it (solve time) aren't safe to chart. */
  stale: boolean;
  /** True when the date's puzzle has been regenerated since (v17 moved
   * generation to the required tier). The record itself is accurate —
   * the words just belong to a puzzle that no longer exists, so the
   * archive says so and a replay starts fresh. */
  retired: boolean;
}

/** Every saved daily, keyed by date — drives the archive listing. */
export async function loadAllDailyProgress(): Promise<
  Record<string, ArchivedDay>
> {
  const out: Record<string, ArchivedDay> = {};
  for (const key of await store.keys("daily:")) {
    const saved = validShape(await store.get<DailyProgress>(key));
    if (saved) {
      out[saved.dateKey] = {
        ...saved,
        stale: !saved.puzzleKey && saved.dictVersion !== DICT_VERSION,
        retired: saved.dictVersion < GENERATOR_VERSION,
      };
    }
  }
  return out;
}

export function saveDailyProgress(progress: DailyProgress) {
  return base.saveDay(progress);
}

/** Wipe a solved day for a fresh replay run; stats stay counted.
 * Writes directly — the multi-tab guard must not "protect" the old
 * run from a deliberate reset. */
export async function resetDailyForReplay(
  dateKey: string,
  currentPuzzleKey?: string,
) {
  await store.set(`daily:${dateKey}`, {
    dateKey,
    dictVersion: DICT_VERSION,
    ...(currentPuzzleKey && { puzzleKey: currentPuzzleKey }),
    foundWords: [],
    grid: {},
    revealed: {},
    solved: false,
    elapsedMs: 0,
    statsRecorded: true,
  } satisfies DailyProgress);
}

/** One-time first-run coach marks. */
export const { loadCoachSeen, markCoachSeen } = base;

export const loadStats = base.loadStats;

/** Call once when a new daily puzzle is first opened. */
export const recordDailyStarted = base.recordStarted;

/**
 * Call once when a daily puzzle reaches the solve threshold. Only
 * TODAY's puzzle moves the streak — solving an archived day counts
 * toward totals but must not rewrite streak history, and lastSolvedDate
 * never moves BACKWARD (westward timezone travel would otherwise reset
 * a streak).
 */
export function recordDailySolved(
  dateKey: string,
  wordsFound: number,
  // The grace day exists for a DAILY session frozen across midnight;
  // an archive play of yesterday must not borrow it to move the streak.
  allowGrace = true,
): Promise<CrosshatchStats> {
  return base.updateStats((stats) => {
    if (stats.lastSolvedDate === dateKey) return stats; // already recorded
    return {
      ...stats,
      solved: stats.solved + 1,
      totalWords: stats.totalWords + wordsFound,
      ...streakAdvance(stats, dateKey, allowGrace),
    };
  });
}

/** Words found AFTER the solve was recorded still count toward the
 * lifetime total — credited incrementally, exactly once per word. */
export async function recordWordsProgress(delta: number): Promise<void> {
  if (delta <= 0) return;
  await base.updateStats((stats) => ({
    ...stats,
    totalWords: stats.totalWords + delta,
  }));
}

/**
 * The streak to DISPLAY: stats.currentStreak is only rewritten on the
 * next solve, so a lapsed streak would show its old value forever.
 * Solving yesterday's puzzle still counts as alive (it dies only when
 * today ends unsolved).
 */
export { displayStreak };
