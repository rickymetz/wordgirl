import { createGameStore } from "../../../lib/storage/createGameStore";
import { localDateKey, previousDateKey } from "../../../lib/date";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { RANKS, type RankTitle } from "../engine/scoring";

export interface DailyProgress {
  dateKey: string;
  dictVersion: number;
  foundWords: string[];
  /** word -> hint-revealed letter positions (older saves stored counts). */
  revealed: Record<string, number[] | number>;
  score: number;
  completed: boolean;
  /** Wall-clock play time accumulated across sessions, frozen at completion. */
  elapsedMs: number;
  /**
   * Set when this date's completion already counted toward stats — a
   * replay must not increment totals again.
   */
  statsRecorded?: boolean;
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

/**
 * Stats updates are read-modify-write on one blob — serialize them so
 * two in flight can never lose a write.
 */
let statsLock: Promise<unknown> = Promise.resolve();
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = statsLock.then(fn, fn);
  statsLock = run.catch(() => {});
  return run;
}

/** The first daily puzzle — the archive reaches back to here. */
export const ARCHIVE_EPOCH = "2026-07-01";

/** A partially-corrupted save must not crash hydration — normalize it. */
function validShape(saved: DailyProgress | null): DailyProgress | null {
  if (!saved || typeof saved !== "object") return null;
  if (!Array.isArray(saved.foundWords)) return null;
  if (typeof saved.score !== "number" || !Number.isFinite(saved.score)) {
    return null;
  }
  if (saved.revealed === null || typeof saved.revealed !== "object") {
    return null;
  }
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
      out[saved.dateKey] = { ...saved, stale: saved.dictVersion !== DICT_VERSION };
    }
  }
  return out;
}

export async function saveDailyProgress(progress: DailyProgress) {
  // Multi-tab guard: found words only ever GROW within a day, so a
  // stored save holding words we don't know about means another tab is
  // ahead — skip the write instead of silently destroying its progress.
  const stored = validShape(
    await store.get<DailyProgress>(`daily:${progress.dateKey}`),
  );
  // A tab running an OLDER build must never clobber a newer build's
  // save - dictVersion only ever grows.
  if (stored && stored.dictVersion > progress.dictVersion) return;
  if (
    stored &&
    stored.dictVersion === progress.dictVersion &&
    stored.foundWords.length > progress.foundWords.length &&
    stored.foundWords.some((w) => !progress.foundWords.includes(w))
  ) {
    return;
  }
  await store.set(`daily:${progress.dateKey}`, progress);
}

/** Wipe a completed day for a fresh replay run; stats stay counted.
 * Writes directly — the multi-tab guard must not "protect" the old
 * run from a deliberate reset. */
export async function resetDailyForReplay(dateKey: string) {
  await store.set(`daily:${dateKey}`, {
    dateKey,
    dictVersion: DICT_VERSION,
    foundWords: [],
    revealed: {},
    score: 0,
    completed: false,
    elapsedMs: 0,
    statsRecorded: true,
  } satisfies DailyProgress);
}

/** One-time first-run coach marks. */
export async function loadCoachSeen(): Promise<boolean> {
  return (await store.get<boolean>("coachSeen")) === true;
}
export async function markCoachSeen(): Promise<void> {
  await store.set("coachSeen", true);
}

export async function loadStats(): Promise<PolygramStats> {
  // Merge over defaults so stats survive schema additions (an older
  // blob without a newer field keeps its streaks and counters).
  const saved = await store.get<Partial<PolygramStats>>("stats");
  return { ...EMPTY_STATS, ...(saved ?? {}) };
}

/** Call once when a new daily puzzle is first opened. */
export function recordDailyStarted(): Promise<void> {
  return serialized(async () => {
    const stats = await loadStats();
    await store.set("stats", { ...stats, played: stats.played + 1 });
  });
}

/**
 * Call once when a daily puzzle is completed. Only TODAY's puzzle moves
 * the streak — finishing an archived day counts toward totals but must
 * not rewrite streak history, and lastCompletedDate never moves
 * BACKWARD (westward timezone travel would otherwise reset a streak).
 */
export function recordDailyCompleted(
  dateKey: string,
  score: number,
  rank: RankTitle,
  // The grace day exists for a DAILY session frozen across midnight;
  // an archive play of yesterday must not borrow it to move the streak.
  allowGrace = true,
): Promise<PolygramStats> {
  return serialized(async () => {
  const stats = await loadStats();
  if (stats.lastCompletedDate === dateKey) return stats; // already recorded

  const rankIndex = (r: RankTitle | null) =>
    r === null ? -1 : RANKS.findIndex((x) => x.title === r);
  // Today's puzzle — with a grace day so a session that crossed
  // midnight mid-play (dateKey frozen at mount) still counts its day.
  const today = localDateKey();
  const isToday =
    dateKey === today || (allowGrace && dateKey === previousDateKey(today));
  const advances =
    isToday &&
    (stats.lastCompletedDate === null || dateKey > stats.lastCompletedDate);
  const continues = stats.lastCompletedDate === previousDateKey(dateKey);
  const currentStreak = continues ? stats.currentStreak + 1 : 1;

  const next: PolygramStats = {
    ...stats,
    completed: stats.completed + 1,
    bestRank: rankIndex(rank) > rankIndex(stats.bestRank) ? rank : stats.bestRank,
    totalScore: stats.totalScore + score,
    ...(advances && {
      currentStreak,
      bestStreak: Math.max(stats.bestStreak, currentStreak),
      lastCompletedDate: dateKey,
    }),
  };
  await store.set("stats", next);
  return next;
  });
}

/**
 * The streak to DISPLAY: stats.currentStreak is only rewritten on the
 * next completion, so a lapsed streak would show its old value forever.
 * Completing yesterday's puzzle still counts as alive (it dies only
 * when today ends uncompleted).
 */
export function displayStreak(
  stats: PolygramStats,
  today = localDateKey(),
): number {
  if (!stats.lastCompletedDate) return 0;
  return stats.lastCompletedDate >= previousDateKey(today)
    ? stats.currentStreak
    : 0;
}