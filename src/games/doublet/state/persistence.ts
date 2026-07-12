import {
  createDailyPersistence,
  displayStreak,
  streakAdvance,
  type DailyBase,
  type StreakStats,
} from "../../../lib/daily/persistence";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import type { Difficulty, PlacedDomino } from "../engine/types";

export interface DailyProgress extends DailyBase {
  difficulty: Difficulty;
  placed: PlacedDomino[];
  foundWords: string[];
  /** Trend counters (absent on saves from before they shipped). */
  moves?: number;
  rotations?: number;
  removals?: number;
  invalidBoards?: number;
  hints?: number;
  /** Opens of this board while unsolved. */
  sessions?: number;
  /** Local hour (0-23) this board was solved. */
  solvedHour?: number;
}

export type DoubletStats = StreakStats;

const EMPTY_STATS: DoubletStats = {
  played: 0,
  solved: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastSolvedDate: null,
};

export const ARCHIVE_EPOCH = "2026-07-10";

const base = createDailyPersistence<DailyProgress, DoubletStats>({
  gameId: "doublet",
  emptyStats: EMPTY_STATS,
  validDay: (s) => Array.isArray(s.placed),
  // Three boards a day: saves key by difficulty AND date.
  dayKey: (day) => `${day.difficulty}:${day.dateKey}`,
});

export const loadDailyProgress = (dateKey: string, difficulty: Difficulty) =>
  base.loadDay(`${difficulty}:${dateKey}`);
export const loadStaleDailyProgress = (
  dateKey: string,
  difficulty: Difficulty,
) => base.loadStaleDay(`${difficulty}:${dateKey}`);
export const saveDailyProgress = base.saveDay;
export const { loadCoachSeen, markCoachSeen, loadStats } = base;
export const recordDailyStarted = base.recordStarted;
export { displayStreak };

/**
 * A DATE's roll-up across its three boards — GameArchive looks days
 * up by plain dateKey, so the per-difficulty saves merge here.
 */
export interface ArchivedDay {
  dateKey: string;
  /** Boards solved that day (0-3). */
  solvedCount: number;
  /** Boards with any progress. */
  startedCount: number;
  /** Any board saved under an older dictionary. */
  stale: boolean;
  /** Total active time across the day's boards. */
  elapsedMs: number;
  /** Summed trend counters — null for days saved before tracking
   * shipped (a legacy day must not chart as zero). */
  moves: number | null;
  rotations: number | null;
  removals: number | null;
  invalidBoards: number | null;
  hints: number | null;
  sessions: number | null;
  /** An hour one of the day's boards was solved at (any board — the
   * histogram wants "when do I play", not per-board precision). */
  solvedHour: number | null;
  /** GameArchive's played contract: all boards' words, merged. */
  foundWords: string[];
}

/** The counters a day sums across its boards (solvedHour merges, not
 * sums). One list drives the null-init, the sum, and the gap rule. */
const COUNTER_KEYS = [
  "moves",
  "rotations",
  "removals",
  "invalidBoards",
  "hints",
  "sessions",
] as const;

export async function loadAllDailyProgress(): Promise<
  Record<string, ArchivedDay>
> {
  // Group the per-difficulty saves by date first: counters only chart
  // when EVERY one of the date's boards carries them — a day mixing
  // pre-tracking and tracked saves would otherwise present a partial
  // sum as the day's total (as fake as a zero), so it stays a gap.
  const byDate: Record<string, DailyProgress[]> = {};
  for (const key of await base.store.keys("daily:")) {
    const saved = base.validShape(await base.store.get<DailyProgress>(key));
    if (saved) (byDate[saved.dateKey] ??= []).push(saved);
  }
  const out: Record<string, ArchivedDay> = {};
  for (const [dateKey, saves] of Object.entries(byDate)) {
    const day: ArchivedDay = {
      dateKey,
      solvedCount: saves.filter((s) => s.solved).length,
      startedCount: saves.filter((s) => s.solved || s.placed.length > 0)
        .length,
      stale: saves.some((s) => s.dictVersion !== DICT_VERSION),
      elapsedMs: saves.reduce((a, s) => a + s.elapsedMs, 0),
      moves: null,
      rotations: null,
      removals: null,
      invalidBoards: null,
      hints: null,
      sessions: null,
      solvedHour:
        saves.map((s) => s.solvedHour).find((h) => h !== undefined) ?? null,
      foundWords: saves.flatMap((s) => s.foundWords ?? []),
    };
    for (const k of COUNTER_KEYS) {
      if (saves.every((s) => s[k] !== undefined)) {
        day[k] = saves.reduce((a, s) => a + s[k]!, 0);
      }
    }
    out[dateKey] = day;
  }
  return out;
}

export async function resetDailyForReplay(
  dateKey: string,
  difficulty: Difficulty,
) {
  await base.store.set(`daily:${difficulty}:${dateKey}`, {
    dateKey,
    difficulty,
    dictVersion: DICT_VERSION,
    placed: [],
    solved: false,
    elapsedMs: 0,
    statsRecorded: true,
    foundWords: [],
  } satisfies DailyProgress);
}

/**
 * Call once per solved BOARD (the hook's statsRecorded marker guards
 * replays and re-opens): `solved` counts boards, matching `played`
 * from recordDailyStarted. The STREAK is per-day — streakAdvance
 * ignores a dateKey that already advanced it.
 */
export function recordDailySolved(
  dateKey: string,
  allowGrace = true,
): Promise<DoubletStats> {
  return base.updateStats((stats) => ({
    ...stats,
    solved: stats.solved + 1,
    ...streakAdvance(stats, dateKey, allowGrace),
  }));
}
