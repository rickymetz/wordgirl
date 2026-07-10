import { createGameStore } from "../../../lib/storage/createGameStore";
import { localDateKey, previousDateKey } from "../../../lib/date";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import type { Difficulty, PlacedDomino } from "../engine/types";

export interface DailyProgress {
  dateKey: string;
  difficulty: Difficulty;
  dictVersion: number;
  placed: PlacedDomino[];
  solved: boolean;
  elapsedMs: number;
  statsRecorded?: boolean;
  foundWords: string[];
}

export interface DoubletStats {
  played: number;
  solved: number;
  currentStreak: number;
  bestStreak: number;
  lastSolvedDate: string | null;
}

const EMPTY_STATS: DoubletStats = {
  played: 0,
  solved: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastSolvedDate: null,
};

const store = createGameStore("doublet");

let statsLock: Promise<unknown> = Promise.resolve();
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = statsLock.then(fn, fn);
  statsLock = run.catch(() => {});
  return run;
}

export const ARCHIVE_EPOCH = "2026-07-10";

function progressKey(dateKey: string, difficulty: Difficulty): string {
  return `daily:${difficulty}:${dateKey}`;
}

function validShape(saved: DailyProgress | null): DailyProgress | null {
  if (!saved || typeof saved !== "object") return null;
  if (!Array.isArray(saved.placed)) return null;
  if (typeof saved.elapsedMs !== "number" || !Number.isFinite(saved.elapsedMs))
    return null;
  return saved;
}

export async function loadDailyProgress(
  dateKey: string,
  difficulty: Difficulty,
): Promise<DailyProgress | null> {
  const saved = validShape(
    await store.get<DailyProgress>(progressKey(dateKey, difficulty)),
  );
  if (saved && saved.dictVersion !== DICT_VERSION) return null;
  return saved;
}

export async function loadStaleDailyProgress(
  dateKey: string,
  difficulty: Difficulty,
): Promise<DailyProgress | null> {
  const saved = validShape(
    await store.get<DailyProgress>(progressKey(dateKey, difficulty)),
  );
  if (saved && saved.dictVersion !== DICT_VERSION) return saved;
  return null;
}

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
  for (const key of await store.keys("daily:")) {
    const saved = validShape(await store.get<DailyProgress>(key));
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

export async function saveDailyProgress(progress: DailyProgress) {
  const key = progressKey(progress.dateKey, progress.difficulty);
  const stored = validShape(await store.get<DailyProgress>(key));
  // A tab running an OLDER build must never clobber a newer build's
  // save - dictVersion only ever grows.
  if (stored && stored.dictVersion > progress.dictVersion) return;
  if (
    stored &&
    stored.dictVersion === progress.dictVersion &&
    stored.solved &&
    !progress.solved
  ) {
    return;
  }
  await store.set(key, progress);
}

export async function resetDailyForReplay(
  dateKey: string,
  difficulty: Difficulty,
) {
  await store.set(progressKey(dateKey, difficulty), {
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

export async function loadCoachSeen(): Promise<boolean> {
  return (await store.get<boolean>("coachSeen")) === true;
}
export async function markCoachSeen(): Promise<void> {
  await store.set("coachSeen", true);
}

export async function loadStats(): Promise<DoubletStats> {
  const saved = await store.get<Partial<DoubletStats>>("stats");
  return { ...EMPTY_STATS, ...(saved ?? {}) };
}

export function recordDailyStarted(): Promise<void> {
  return serialized(async () => {
    const stats = await loadStats();
    await store.set("stats", { ...stats, played: stats.played + 1 });
  });
}

/**
 * Call once per solved BOARD (the hook's statsRecorded marker guards
 * replays and re-opens): `solved` counts boards, matching `played`
 * from recordDailyStarted, so the archive's Win % is coherent. The
 * STREAK is per-day — the first board solved on a new day advances
 * it; the second and third that day don't re-count.
 */
export function recordDailySolved(
  dateKey: string,
  allowGrace = true,
): Promise<DoubletStats> {
  return serialized(async () => {
    const stats = await loadStats();
    const today = localDateKey();
    const isToday =
      dateKey === today || (allowGrace && dateKey === previousDateKey(today));
    const advances =
      isToday &&
      (stats.lastSolvedDate === null || dateKey > stats.lastSolvedDate);
    const continues = stats.lastSolvedDate === previousDateKey(dateKey);
    const currentStreak = continues ? stats.currentStreak + 1 : 1;

    const next: DoubletStats = {
      ...stats,
      solved: stats.solved + 1,
      ...(advances && {
        currentStreak,
        bestStreak: Math.max(stats.bestStreak, currentStreak),
        lastSolvedDate: dateKey,
      }),
    };
    await store.set("stats", next);
    return next;
  });
}

export function displayStreak(
  stats: DoubletStats,
  today = localDateKey(),
): number {
  if (!stats.lastSolvedDate) return 0;
  return stats.lastSolvedDate >= previousDateKey(today)
    ? stats.currentStreak
    : 0;
}
