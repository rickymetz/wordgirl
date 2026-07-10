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

export interface ArchivedDay extends DailyProgress {
  stale: boolean;
}

export async function loadAllDailyProgress(): Promise<
  Record<string, ArchivedDay>
> {
  const out: Record<string, ArchivedDay> = {};
  for (const key of await store.keys("daily:")) {
    const saved = validShape(await store.get<DailyProgress>(key));
    if (saved) {
      const composite = `${saved.difficulty}:${saved.dateKey}`;
      out[composite] = {
        ...saved,
        stale: saved.dictVersion !== DICT_VERSION,
      };
    }
  }
  return out;
}

export async function saveDailyProgress(progress: DailyProgress) {
  const key = progressKey(progress.dateKey, progress.difficulty);
  const stored = validShape(await store.get<DailyProgress>(key));
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

export function recordDailySolved(
  dateKey: string,
  allowGrace = true,
): Promise<DoubletStats> {
  return serialized(async () => {
    const stats = await loadStats();
    const alreadyRecordedDate = stats.lastSolvedDate === dateKey;

    const today = localDateKey();
    const isToday =
      dateKey === today || (allowGrace && dateKey === previousDateKey(today));
    const advances =
      !alreadyRecordedDate &&
      isToday &&
      (stats.lastSolvedDate === null || dateKey > stats.lastSolvedDate);
    const continues = stats.lastSolvedDate === previousDateKey(dateKey);
    const currentStreak = continues ? stats.currentStreak + 1 : 1;

    if (alreadyRecordedDate) return stats;

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
