import { createGameStore } from "../../../lib/storage/createGameStore";
import { localDateKey, previousDateKey } from "../../../lib/date";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { RANKS, type RankTitle } from "../engine/scoring";

export interface DailyProgress {
  dateKey: string;
  dictVersion: number;
  /** Distinct words banked so far, in the order they were found. */
  foundWords: string[];
  /** Player-typed letters still on the grid, cell key -> letter. */
  grid: Record<string, string>;
  /** Hint reveals: word -> revealed letter positions. */
  revealed: Record<string, number[]>;
  /** Reached the solve threshold (SOLVE_PCT of all combos). */
  solved: boolean;
  /** Wall-clock play time across sessions, frozen at the solve moment. */
  elapsedMs: number;
  /**
   * Set when this date's solve already counted toward stats — a replay
   * must not increment totals again.
   */
  statsRecorded?: boolean;
}

export interface CrosshatchStats {
  played: number;
  solved: number;
  currentStreak: number;
  bestStreak: number;
  lastSolvedDate: string | null;
  bestRank: RankTitle | null;
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

const store = createGameStore("crosshatch");

/** The first daily puzzle — the archive reaches back to here. */
export const ARCHIVE_EPOCH = "2026-07-06";

/** A partially-corrupted save must not crash hydration — normalize it. */
function validShape(saved: DailyProgress | null): DailyProgress | null {
  if (!saved || typeof saved !== "object") return null;
  if (!Array.isArray(saved.foundWords)) return null;
  if (saved.grid === null || typeof saved.grid !== "object") return null;
  if (typeof saved.elapsedMs !== "number" || !Number.isFinite(saved.elapsedMs)) {
    return null;
  }
  return saved;
}

/**
 * The playable save for a date, or null. Saves written against an older
 * dictionary can't be resumed (their words may not exist in the current
 * puzzle) — use loadStaleDailyProgress to read their historical result.
 */
export async function loadDailyProgress(
  dateKey: string,
): Promise<DailyProgress | null> {
  const saved = validShape(await store.get<DailyProgress>(`daily:${dateKey}`));
  if (saved && saved.dictVersion !== DICT_VERSION) return null;
  return saved;
}

/** A save from an OLDER dictionary version, kept as a historical record. */
export async function loadStaleDailyProgress(
  dateKey: string,
): Promise<DailyProgress | null> {
  const saved = validShape(await store.get<DailyProgress>(`daily:${dateKey}`));
  if (saved && saved.dictVersion !== DICT_VERSION) return saved;
  return null;
}

export interface ArchivedDay extends DailyProgress {
  /** True when played against an older dictionary (result-only record). */
  stale: boolean;
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
        stale: saved.dictVersion !== DICT_VERSION,
      };
    }
  }
  return out;
}

export async function saveDailyProgress(progress: DailyProgress) {
  await store.set(`daily:${progress.dateKey}`, progress);
}

/** Wipe a solved day for a fresh replay run; stats stay counted. */
export async function resetDailyForReplay(dateKey: string) {
  await saveDailyProgress({
    dateKey,
    dictVersion: DICT_VERSION,
    foundWords: [],
    grid: {},
    revealed: {},
    solved: false,
    elapsedMs: 0,
    statsRecorded: true,
  });
}

/** One-time first-run coach marks. */
export async function loadCoachSeen(): Promise<boolean> {
  return (await store.get<boolean>("coachSeen")) === true;
}
export async function markCoachSeen(): Promise<void> {
  await store.set("coachSeen", true);
}

export async function loadStats(): Promise<CrosshatchStats> {
  // Merge over defaults so stats survive schema additions (an older
  // blob without totalWords keeps its streaks and counters).
  const saved = await store.get<Partial<CrosshatchStats>>("stats");
  return { ...EMPTY_STATS, ...(saved ?? {}) };
}

/** Call once when a new daily puzzle is first opened. */
export async function recordDailyStarted(): Promise<void> {
  const stats = await loadStats();
  await store.set("stats", { ...stats, played: stats.played + 1 });
}

const rankIndex = (r: RankTitle | null) =>
  r === null ? -1 : RANKS.findIndex((x) => x.title === r);

/**
 * Call once when a daily puzzle reaches the solve threshold. Only
 * TODAY's puzzle moves the streak — solving an archived day counts
 * toward totals but must not rewrite streak history, and lastSolvedDate
 * never moves BACKWARD (westward timezone travel would otherwise reset
 * a streak).
 */
export async function recordDailySolved(
  dateKey: string,
  wordsFound: number,
  rank: RankTitle,
): Promise<CrosshatchStats> {
  const stats = await loadStats();
  if (stats.lastSolvedDate === dateKey) return stats; // already recorded

  const isToday = dateKey === localDateKey();
  const advances =
    isToday &&
    (stats.lastSolvedDate === null || dateKey > stats.lastSolvedDate);
  const continues = stats.lastSolvedDate === previousDateKey(dateKey);
  const currentStreak = continues ? stats.currentStreak + 1 : 1;

  const next: CrosshatchStats = {
    ...stats,
    solved: stats.solved + 1,
    bestRank:
      rankIndex(rank) > rankIndex(stats.bestRank) ? rank : stats.bestRank,
    totalWords: stats.totalWords + wordsFound,
    ...(advances && {
      currentStreak,
      bestStreak: Math.max(stats.bestStreak, currentStreak),
      lastSolvedDate: dateKey,
    }),
  };
  await store.set("stats", next);
  return next;
}

/**
 * The rank can still improve AFTER the solve is recorded (pushing from
 * Genius to a perfect Crosshatch) — upgrade bestRank without touching
 * the counters.
 */
export async function recordRankImproved(rank: RankTitle): Promise<void> {
  const stats = await loadStats();
  if (rankIndex(rank) <= rankIndex(stats.bestRank)) return;
  await store.set("stats", { ...stats, bestRank: rank });
}
