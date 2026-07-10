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
  /** GameArchive's played contract: all boards' words, merged. */
  foundWords: string[];
}

export async function loadAllDailyProgress(): Promise<
  Record<string, ArchivedDay>
> {
  const out: Record<string, ArchivedDay> = {};
  for (const key of await base.store.keys("daily:")) {
    const saved = base.validShape(await base.store.get<DailyProgress>(key));
    if (!saved) continue;
    const day = (out[saved.dateKey] ??= {
      dateKey: saved.dateKey,
      solvedCount: 0,
      startedCount: 0,
      stale: false,
      elapsedMs: 0,
      foundWords: [],
    });
    if (saved.solved) day.solvedCount += 1;
    if (saved.solved || saved.placed.length > 0) day.startedCount += 1;
    if (saved.dictVersion !== DICT_VERSION) day.stale = true;
    day.elapsedMs += saved.elapsedMs;
    day.foundWords.push(...(saved.foundWords ?? []));
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
