import { createGameStore } from "../../../lib/storage/createGameStore";
import { previousDateKey } from "../../../lib/date";
import { DICT_VERSION } from "../engine/dictionary";
import { RANKS, type RankTitle } from "../engine/scoring";

export interface DailyProgress {
  dateKey: string;
  dictVersion: number;
  foundWords: string[];
  revealed: Record<string, number>;
  score: number;
  completed: boolean;
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
const KEEP_DAILIES = 7;

export async function loadDailyProgress(
  dateKey: string,
): Promise<DailyProgress | null> {
  const saved = await store.get<DailyProgress>(`daily:${dateKey}`);
  // A save from an older dictionary can reference words that no longer
  // exist (or miss new ones) — start that day fresh instead of wedging.
  if (saved && saved.dictVersion !== DICT_VERSION) return null;
  return saved;
}

export async function saveDailyProgress(progress: DailyProgress) {
  await store.set(`daily:${progress.dateKey}`, progress);
  await pruneOldDailies();
}

async function pruneOldDailies() {
  const keys = await store.keys("daily:");
  const sorted = keys.sort(); // date keys sort chronologically
  for (const key of sorted.slice(0, Math.max(0, sorted.length - KEEP_DAILIES))) {
    await store.remove(key);
  }
}

export async function loadStats(): Promise<PolygramStats> {
  return (await store.get<PolygramStats>("stats")) ?? EMPTY_STATS;
}

/** Call once when a new daily puzzle is first opened. */
export async function recordDailyStarted(): Promise<void> {
  const stats = await loadStats();
  await store.set("stats", { ...stats, played: stats.played + 1 });
}

/** Call once when the daily puzzle is completed. */
export async function recordDailyCompleted(
  dateKey: string,
  score: number,
  rank: RankTitle,
): Promise<PolygramStats> {
  const stats = await loadStats();
  if (stats.lastCompletedDate === dateKey) return stats; // already recorded

  const continues = stats.lastCompletedDate === previousDateKey(dateKey);
  const currentStreak = continues ? stats.currentStreak + 1 : 1;
  const rankIndex = (r: RankTitle | null) =>
    r === null ? -1 : RANKS.findIndex((x) => x.title === r);

  const next: PolygramStats = {
    ...stats,
    completed: stats.completed + 1,
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    lastCompletedDate: dateKey,
    bestRank: rankIndex(rank) > rankIndex(stats.bestRank) ? rank : stats.bestRank,
    totalScore: stats.totalScore + score,
  };
  await store.set("stats", next);
  return next;
}
