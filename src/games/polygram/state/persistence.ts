import { createGameStore } from "../../../lib/storage/createGameStore";
import { localDateKey, previousDateKey } from "../../../lib/date";
import { DICT_VERSION } from "../engine/dictionary";
import { RANKS, type RankTitle } from "../engine/scoring";

export interface DailyProgress {
  dateKey: string;
  dictVersion: number;
  foundWords: string[];
  revealed: Record<string, number>;
  score: number;
  completed: boolean;
  /** Wall-clock play time accumulated across sessions, frozen at completion. */
  elapsedMs: number;
}

export interface PolygramStats {
  played: number;
  completed: number;
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
  bestRank: RankTitle | null;
  totalScore: number;
}

const EMPTY_STATS: PolygramStats = {
  played: 0,
  completed: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastCompletedDate: null,
  bestRank: null,
  totalScore: 0,
};

const store = createGameStore("polygram");

/** The first daily puzzle — the archive reaches back to here. */
export const ARCHIVE_EPOCH = "2026-07-01";

export async function loadDailyProgress(
  dateKey: string,
): Promise<DailyProgress | null> {
  const saved = await store.get<DailyProgress>(`daily:${dateKey}`);
  // A save from an older dictionary can reference words that no longer
  // exist (or miss new ones) — start that day fresh instead of wedging.
  if (saved && saved.dictVersion !== DICT_VERSION) return null;
  return saved;
}

/** Every saved daily, keyed by date — drives the archive listing. */
export async function loadAllDailyProgress(): Promise<
  Record<string, DailyProgress>
> {
  const out: Record<string, DailyProgress> = {};
  for (const key of await store.keys("daily:")) {
    const saved = await store.get<DailyProgress>(key);
    if (saved && saved.dictVersion === DICT_VERSION) {
      out[saved.dateKey] = saved;
    }
  }
  return out;
}

export async function saveDailyProgress(progress: DailyProgress) {
  await store.set(`daily:${progress.dateKey}`, progress);
}

export async function loadStats(): Promise<PolygramStats> {
  return (await store.get<PolygramStats>("stats")) ?? EMPTY_STATS;
}

/** Call once when a new daily puzzle is first opened. */
export async function recordDailyStarted(): Promise<void> {
  const stats = await loadStats();
  await store.set("stats", { ...stats, played: stats.played + 1 });
}

/**
 * Call once when a daily puzzle is completed. Only TODAY's puzzle moves
 * the streak — finishing an archived day counts toward totals but must
 * not rewrite streak history.
 */
export async function recordDailyCompleted(
  dateKey: string,
  score: number,
  rank: RankTitle,
): Promise<PolygramStats> {
  const stats = await loadStats();
  if (stats.lastCompletedDate === dateKey) return stats; // already recorded

  const rankIndex = (r: RankTitle | null) =>
    r === null ? -1 : RANKS.findIndex((x) => x.title === r);
  const isToday = dateKey === localDateKey();
  const continues = stats.lastCompletedDate === previousDateKey(dateKey);
  const currentStreak = continues ? stats.currentStreak + 1 : 1;

  const next: PolygramStats = {
    ...stats,
    completed: stats.completed + 1,
    bestRank: rankIndex(rank) > rankIndex(stats.bestRank) ? rank : stats.bestRank,
    totalScore: stats.totalScore + score,
    ...(isToday && {
      currentStreak,
      bestStreak: Math.max(stats.bestStreak, currentStreak),
      lastCompletedDate: dateKey,
    }),
  };
  await store.set("stats", next);
  return next;
}
