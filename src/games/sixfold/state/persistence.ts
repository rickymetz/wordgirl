import {
  countsAsToday,
  createDailyPersistence,
  displayStreak,
  streakAdvance,
  type DailyBase,
  type StreakStats,
} from "../../../lib/daily/persistence";
import { puzzleKey as makePuzzleKey } from "../../../lib/puzzleKey";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import type { SixfoldPuzzle } from "../engine/types";
import { CELLS } from "../engine/types";

export interface DailyProgress extends DailyBase {
  /** One char per cell, row-major: a letter or "." (givens included). */
  entries: string;
  /** Cells a hint filled. */
  revealed: number[];
  /** Cells the player (or a hint) has filled beyond the givens — the
   *  hub's "in progress" test and the roundup's count. */
  filled?: number;
  hints?: number;
  /** Placements that created a duplicate (trends). */
  conflicts?: number;
  /** Opens of this day while unsolved. */
  sessions?: number;
  /** Local hour (0-23) the board was solved. */
  solvedHour?: number;
  /** The day's words, stored so the archive can list a finished day
   *  without regenerating its puzzle. */
  cluedWord?: string;
  hiddenWord?: string;
}

export interface SixfoldStats extends StreakStats {
  /** Fastest daily solve. */
  bestTimeMs: number | null;
  /** Days solved without a hint. */
  hintFreeSolves: number;
}

const EMPTY_STATS: SixfoldStats = {
  played: 0,
  solved: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastSolvedDate: null,
  bestTimeMs: null,
  hintFreeSolves: 0,
};

/** The first daily puzzle — the archive reaches back to here. */
export const ARCHIVE_EPOCH = "2026-09-23";

const base = createDailyPersistence<DailyProgress, SixfoldStats>({
  gameId: "sixfold",
  emptyStats: EMPTY_STATS,
  validDay: (s) =>
    typeof s.entries === "string" &&
    s.entries.length === CELLS &&
    Array.isArray(s.revealed),
  // Entries legitimately shrink (erase), so growth checks can't apply:
  // a tab that never edited the board itself may only refresh a save
  // it agrees with, and counters never regress within a day.
  allowUnsolvedWrite: (stored, progress, { owned }) =>
    owned === true ||
    (stored.entries === progress.entries &&
      (progress.hints ?? 0) >= (stored.hints ?? 0) &&
      (progress.conflicts ?? 0) >= (stored.conflicts ?? 0) &&
      (progress.sessions ?? 0) >= (stored.sessions ?? 0)),
});

/** The solution and givens ARE the puzzle — an unrelated DICT_VERSION
 *  bump keeps saves valid while the board is unchanged. */
export function sixfoldPuzzleKey(p: SixfoldPuzzle): string {
  return makePuzzleKey([p.solution, p.givens, p.row, p.col]);
}

export const loadDailyProgress = (
  dateKey: string,
  currentPuzzleKey?: string,
) => base.loadDay(dateKey, currentPuzzleKey);
export const loadStaleDailyProgress = (
  dateKey: string,
  currentPuzzleKey?: string,
) => base.loadStaleDay(dateKey, currentPuzzleKey);

/** Was the board solved on that date — the RECORD, version-insensitive
 *  (history doesn't un-happen on a dict bump). */
export const isDaySolved = async (dateKey: string): Promise<boolean> =>
  (await base.loadDayRecord(dateKey))?.solved === true;

export const { loadCoachSeen, markCoachSeen, loadStats } = base;
export const { loadTutorialSeen, markTutorialSeen } = base;
export const recordDailyStarted = base.recordStarted;
export { displayStreak };

export interface ArchivedDay extends DailyProgress {
  stale: boolean;
  /** GameArchive's shared contract; a solved day lists its two words. */
  foundWords: string[];
}

export async function loadAllDailyProgress(): Promise<
  Record<string, ArchivedDay>
> {
  const out: Record<string, ArchivedDay> = {};
  for (const key of await base.store.keys("daily:")) {
    const saved = base.validShape(await base.store.get<DailyProgress>(key));
    if (saved) {
      out[saved.dateKey] = {
        ...saved,
        foundWords:
          saved.solved && saved.cluedWord && saved.hiddenWord
            ? [saved.cluedWord, saved.hiddenWord]
            : [],
        stale: !saved.puzzleKey && saved.dictVersion !== DICT_VERSION,
      };
    }
  }
  return out;
}

export function saveDailyProgress(
  progress: DailyProgress,
  opts?: {
    /** This tab changed the board itself — its entries are the truth. */
    edited?: boolean;
  },
) {
  return base.saveDay(progress, { owned: opts?.edited });
}

/** Wipe a solved day for a fresh replay run; stats stay counted. Writes
 *  directly — the multi-tab guard must not "protect" the old run. */
export async function resetDailyForReplay(
  dateKey: string,
  entries: string,
  currentPuzzleKey?: string,
) {
  await base.store.set(`daily:${dateKey}`, {
    dateKey,
    dictVersion: DICT_VERSION,
    ...(currentPuzzleKey && { puzzleKey: currentPuzzleKey }),
    entries,
    revealed: [],
    solved: false,
    elapsedMs: 0,
    statsRecorded: true,
  } satisfies DailyProgress);
}

/**
 * Call once when a daily board completes. Only TODAY's puzzle moves the
 * streak and the best time — an archive play counts toward totals but
 * must not rewrite streak history or claim a time record.
 */
export function recordDailySolved(
  dateKey: string,
  elapsedMs: number,
  hints: number,
  // The grace day exists for a DAILY session frozen across midnight;
  // an archive play of yesterday must not borrow it.
  allowGrace = true,
): Promise<SixfoldStats> {
  return base.updateStats((stats) => {
    if (stats.lastSolvedDate === dateKey) return stats; // already recorded
    return {
      ...stats,
      solved: stats.solved + 1,
      hintFreeSolves: stats.hintFreeSolves + (hints === 0 ? 1 : 0),
      ...(countsAsToday(dateKey, allowGrace) && {
        bestTimeMs:
          stats.bestTimeMs === null
            ? elapsedMs
            : Math.min(stats.bestTimeMs, elapsedMs),
      }),
      ...streakAdvance(stats, dateKey, allowGrace),
    };
  });
}
