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

export interface DailyProgress extends DailyBase {
  /** Committed placements, in the order they were laid. Palindromes
   * store their FULL word (rowSaveKey) — the bare half is ambiguous. */
  rows: string[];
  /** Trend counters, absent on saves from before they shipped
   * (legacy days chart as gaps, never fake zeros). */
  sessions?: number;
  takeBacks?: number;
  invalids?: number;
  hints?: number;
  /** ✦ rows on the board (the lifetime total lives in stats). */
  glyphRows?: number;
  /** The day's par (fewest possible rows) — stored so the archive and
   * the charts can read a finished day without re-deriving its puzzle. */
  parRows?: number;
  /** Local hour (0-23) the board was solved. */
  solvedHour?: number;
}

export interface BackwordsStats extends StreakStats {
  /** Fastest daily solve. */
  bestTimeMs: number | null;
  /** Lifetime ✦ rows — placements a real mirror would render. */
  glyphRows: number;
  /** Days solved in the fewest possible rows. */
  parSolves: number;
}

const EMPTY_STATS: BackwordsStats = {
  played: 0,
  solved: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastSolvedDate: null,
  bestTimeMs: null,
  glyphRows: 0,
  parSolves: 0,
};

/** The first daily puzzle — the archive reaches back to here. */
export const ARCHIVE_EPOCH = "2026-07-10";

const base = createDailyPersistence<DailyProgress, BackwordsStats>({
  gameId: "backwords",
  emptyStats: EMPTY_STATS,
  validDay: (s) =>
    Array.isArray(s.rows) && s.rows.every((r) => typeof r === "string"),
  // Rows legitimately SHRINK here (breakRow), so growth checks can't
  // apply — instead, a tab that never edited the board itself may only
  // refresh a save it agrees with: same rows AND no counter regression
  // (counters change without touching rows, so rows agreement alone no
  // longer covers everything the save carries; within a day they only
  // ever grow).
  allowUnsolvedWrite: (stored, progress, { owned }) =>
    owned === true ||
    (stored.rows.join("\n") === progress.rows.join("\n") &&
      (progress.takeBacks ?? 0) >= (stored.takeBacks ?? 0) &&
      (progress.invalids ?? 0) >= (stored.invalids ?? 0) &&
      (progress.sessions ?? 0) >= (stored.sessions ?? 0)),
});

/** Deterministic fingerprint of a Backwords puzzle — the rows array
 * IS the puzzle identity, so an unrelated DICT_VERSION bump won't
 * invalidate saved progress when the actual puzzle hasn't changed. */
export function backwordsPuzzleKey(rows: string[]): string {
  return makePuzzleKey(rows);
}

export const loadDailyProgress = (
  dateKey: string,
  currentPuzzleKey?: string,
) => base.loadDay(dateKey, currentPuzzleKey);
export const loadStaleDailyProgress = (
  dateKey: string,
  currentPuzzleKey?: string,
) => base.loadStaleDay(dateKey, currentPuzzleKey);
export const { loadCoachSeen, markCoachSeen, loadStats } = base;
export const { loadTutorialSeen, markTutorialSeen } = base;
export const recordDailyStarted = base.recordStarted;
export { displayStreak };

export interface ArchivedDay extends DailyProgress {
  stale: boolean;
  /** GameArchive's shared contract exposes foundWords; rows map to it. */
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
        foundWords: saved.rows,
        stale: !saved.puzzleKey && saved.dictVersion !== DICT_VERSION,
      };
    }
  }
  return out;
}

export function saveDailyProgress(
  progress: DailyProgress,
  opts?: {
    /** This tab committed or broke a row itself — its rows are the
     * truth even when they've shrunk back to zero. */
    rowsEdited?: boolean;
  },
) {
  return base.saveDay(progress, { owned: opts?.rowsEdited });
}

/** Wipe a solved day for a fresh replay run; stats stay counted.
 * Writes directly — the multi-tab guard must not "protect" the old
 * run from a deliberate reset. */
export async function resetDailyForReplay(
  dateKey: string,
  currentPuzzleKey?: string,
) {
  await base.store.set(`daily:${dateKey}`, {
    dateKey,
    dictVersion: DICT_VERSION,
    ...(currentPuzzleKey && { puzzleKey: currentPuzzleKey }),
    rows: [],
    solved: false,
    elapsedMs: 0,
    statsRecorded: true,
  } satisfies DailyProgress);
}

/**
 * Call once when a daily board completes. Only TODAY's puzzle moves
 * the streak and the best time — an archive play counts toward totals
 * but must not rewrite streak history or claim a time record.
 */
export function recordDailySolved(
  dateKey: string,
  elapsedMs: number,
  glyphRows: number,
  /** Solved in the fewest possible rows — counts in every daily mode
   * (unlike the best time, an archive par is a real par). */
  atPar: boolean,
  // The grace day exists for a DAILY session frozen across midnight;
  // an archive play of yesterday must not borrow it.
  allowGrace = true,
): Promise<BackwordsStats> {
  return base.updateStats((stats) => {
    if (stats.lastSolvedDate === dateKey) return stats; // already recorded
    return {
      ...stats,
      solved: stats.solved + 1,
      glyphRows: stats.glyphRows + glyphRows,
      parSolves: stats.parSolves + (atPar ? 1 : 0),
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
