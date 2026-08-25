import {
  createDailyPersistence,
  displayStreak as _displayStreak,
  streakAdvance,
  type DailyBase,
  type StreakStats,
} from "../../../lib/daily/persistence";
import { puzzleKey as makePuzzleKey } from "../../../lib/puzzleKey";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import type { Puzzle } from "../engine/types";

export interface DailyProgress extends DailyBase {
  foundWords: string[];
  /** word -> hint-revealed letter positions (older saves stored counts). */
  revealed: Record<string, number[] | number>;
  /** Level indices the player skipped (gate met via bonus words). */
  skippedLevels?: number[];
  /** Legacy field name for `solved` — kept for backward compat. */
  completed: boolean;
  /**
   * Local hour 0–23 the day was completed, for the Stats page's
   * "When you solve". Optional and only stamped on the session that
   * finished it, so every day banked before this shipped stays absent
   * and charts as nothing rather than as midnight.
   */
  solvedHour?: number;
  /**
   * The words this day ASKED for — its required tier.
   *
   * Deliberately a new field rather than a redefinition of the old
   * `totalWords`, which briefly meant required PLUS bonus. A save from
   * those hours holds a number up to 100x larger, and silently reusing
   * the name would have made those days read as near-total failures.
   * Nothing reads `totalWords` now, so such a save falls back to
   * reporting its count alone, which is what it can honestly say.
   */
  requiredWords?: number;
  /**
   * Opens of this day while unfinished. Absent means unknowable — a day
   * banked before the counter shipped, never backfilled, because a
   * partial count is as much of a lie as a zero.
   */
  sessions?: number;
}

export interface PolygramStats extends StreakStats {
  /** Legacy alias for StreakStats.solved — kept for backward compat. */
  completed: number;
  /** Legacy alias for StreakStats.lastSolvedDate. */
  lastCompletedDate: string | null;
  /** Lifetime words found on solved days. Accrues from the day it shipped. */
  totalWords: number;
}

const emptyStats: PolygramStats = {
  played: 0,
  solved: 0,
  completed: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastSolvedDate: null,
  lastCompletedDate: null,
  totalWords: 0,
};

/**
 * Normalize legacy field names so the shared guards work on old saves.
 * Old saves have `completed` but no `solved`; sync them both ways.
 */
function normalizeDayFields(saved: DailyProgress): void {
  if (saved.solved === undefined && saved.completed !== undefined) {
    saved.solved = saved.completed;
  }
  saved.completed = saved.solved;
}

function normalizeStatFields(s: PolygramStats): PolygramStats {
  return {
    ...s,
    solved: s.completed ?? s.solved,
    completed: s.completed ?? s.solved,
    lastSolvedDate: s.lastCompletedDate ?? s.lastSolvedDate,
    lastCompletedDate: s.lastCompletedDate ?? s.lastSolvedDate,
  };
}

const daily = createDailyPersistence<DailyProgress, PolygramStats>({
  gameId: "polygram",
  emptyStats,
  validDay: (saved) => {
    normalizeDayFields(saved);
    return (
      Array.isArray(saved.foundWords) &&
      saved.revealed !== null &&
      typeof saved.revealed === "object"
    );
  },
  allowUnsolvedWrite: (stored, progress) =>
    !(
      stored.foundWords.length > progress.foundWords.length &&
      stored.foundWords.some((w) => !progress.foundWords.includes(w))
    ),
});

export const store = daily.store;

export function polygramPuzzleKey(puzzle: Puzzle): string {
  return makePuzzleKey([
    puzzle.letters,
    puzzle.levels.map((l) => [l.size, l.words, l.bonusWords]),
  ]);
}

/** The first daily puzzle — the archive reaches back to here. */
export const ARCHIVE_EPOCH = "2026-07-01";

export const loadDailyProgress = (
  dateKey: string,
  currentPuzzleKey?: string,
) => daily.loadDay(dateKey, currentPuzzleKey);
export const loadStaleDailyProgress = (
  dateKey: string,
  currentPuzzleKey?: string,
) => daily.loadStaleDay(dateKey, currentPuzzleKey);

/** Was the day finished on that date — the RECORD, version-insensitive
 *  (history doesn't un-happen on a dict bump), for the cross-game
 *  "all games done" streak. */
export const isDaySolved = async (dateKey: string): Promise<boolean> =>
  (await daily.loadDayRecord(dateKey))?.solved === true;

export const { loadCoachSeen, markCoachSeen } = daily;
export const { loadTutorialSeen, markTutorialSeen } = daily;

export async function loadStats(): Promise<PolygramStats> {
  return normalizeStatFields(await daily.loadStats());
}

export const recordDailyStarted = daily.recordStarted;

export async function saveDailyProgress(
  progress: DailyProgress,
): Promise<void> {
  progress.solved = progress.completed;
  await daily.saveDay(progress);
}

export interface ArchivedDay extends DailyProgress {
  stale: boolean;
}

export async function loadAllDailyProgress(): Promise<
  Record<string, ArchivedDay>
> {
  const out: Record<string, ArchivedDay> = {};
  for (const key of await store.keys("daily:")) {
    const saved = daily.validShape(await store.get<DailyProgress>(key));
    if (saved) {
      out[saved.dateKey] = {
        ...saved,
        stale: !saved.puzzleKey && saved.dictVersion !== DICT_VERSION,
      };
    }
  }
  return out;
}

export async function resetDailyForReplay(
  dateKey: string,
  currentPuzzleKey?: string,
): Promise<void> {
  await store.set(`daily:${dateKey}`, {
    dateKey,
    dictVersion: DICT_VERSION,
    ...(currentPuzzleKey && { puzzleKey: currentPuzzleKey }),
    foundWords: [],
    revealed: {},
    skippedLevels: [],
    completed: false,
    solved: false,
    elapsedMs: 0,
    statsRecorded: true,
  } satisfies DailyProgress);
}

export function recordDailyCompleted(
  dateKey: string,
  wordsFound: number,
  allowGrace = true,
): Promise<PolygramStats> {
  return daily.updateStats((raw) => {
    const stats = normalizeStatFields(raw);
    if (stats.lastCompletedDate === dateKey) return stats;

    const streak = streakAdvance(stats, dateKey, allowGrace);

    const next: PolygramStats = {
      ...stats,
      solved: stats.solved + 1,
      completed: stats.solved + 1,
      totalWords: stats.totalWords + wordsFound,
      ...streak,
      lastCompletedDate: streak.lastSolvedDate ?? stats.lastCompletedDate,
    };
    return next;
  });
}

export function displayStreak(
  stats: PolygramStats,
  today?: string,
): number {
  return _displayStreak(normalizeStatFields(stats), today);
}
