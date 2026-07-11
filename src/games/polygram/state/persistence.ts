import {
  createDailyPersistence,
  displayStreak as _displayStreak,
  streakAdvance,
  type DailyBase,
  type StreakStats,
} from "../../../lib/daily/persistence";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { RANKS, type RankTitle } from "../engine/scoring";

export interface DailyProgress extends DailyBase {
  foundWords: string[];
  /** word -> hint-revealed letter positions (older saves stored counts). */
  revealed: Record<string, number[] | number>;
  score: number;
  /** Legacy field name for `solved` — kept for backward compat. */
  completed: boolean;
}

export interface PolygramStats extends StreakStats {
  /** Legacy alias for StreakStats.solved — kept for backward compat. */
  completed: number;
  /** Legacy alias for StreakStats.lastSolvedDate. */
  lastCompletedDate: string | null;
  bestRank: RankTitle | null;
  totalScore: number;
}

const emptyStats: PolygramStats = {
  played: 0,
  solved: 0,
  completed: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastSolvedDate: null,
  lastCompletedDate: null,
  bestRank: null,
  totalScore: 0,
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
      typeof saved.score === "number" &&
      Number.isFinite(saved.score) &&
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

/** The first daily puzzle — the archive reaches back to here. */
export const ARCHIVE_EPOCH = "2026-07-01";

export const loadDailyProgress = (dateKey: string) => daily.loadDay(dateKey);
export const loadStaleDailyProgress = (dateKey: string) =>
  daily.loadStaleDay(dateKey);
export const { loadCoachSeen, markCoachSeen } = daily;

export async function loadStats(): Promise<PolygramStats> {
  return normalizeStatFields(await daily.loadStats());
}

export function recordDailyStarted(): Promise<void> {
  daily.recordStarted().then(() => {});
  return Promise.resolve();
}

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
        stale: saved.dictVersion !== DICT_VERSION,
      };
    }
  }
  return out;
}

export async function resetDailyForReplay(dateKey: string): Promise<void> {
  await store.set(`daily:${dateKey}`, {
    dateKey,
    dictVersion: DICT_VERSION,
    foundWords: [],
    revealed: {},
    score: 0,
    completed: false,
    solved: false,
    elapsedMs: 0,
    statsRecorded: true,
  } satisfies DailyProgress);
}

export function recordDailyCompleted(
  dateKey: string,
  score: number,
  rank: RankTitle,
  allowGrace = true,
): Promise<PolygramStats> {
  return daily.updateStats((raw) => {
    const stats = normalizeStatFields(raw);
    if (stats.lastCompletedDate === dateKey) return stats;

    const rankIndex = (r: RankTitle | null) =>
      r === null ? -1 : RANKS.findIndex((x) => x.title === r);

    const streak = streakAdvance(stats, dateKey, allowGrace);

    const next: PolygramStats = {
      ...stats,
      solved: stats.solved + 1,
      completed: stats.solved + 1,
      bestRank:
        rankIndex(rank) > rankIndex(stats.bestRank) ? rank : stats.bestRank,
      totalScore: stats.totalScore + score,
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
