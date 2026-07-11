import {
  createDailyPersistence,
  displayStreak as _displayStreak,
  type DailyBase,
  type StreakStats,
} from "../../../lib/daily/persistence";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import type { Cell, Difficulty } from "../engine/types";

export interface DayProgress extends DailyBase {
  dateKey: string;
  difficulty: Difficulty;
  puzzleId: string;
  cells: Cell[];
}

export interface ArchivedDay extends DayProgress {
  stale: boolean;
  foundWords: string[];
}

export interface SerpentineStats extends StreakStats {
  bestTimeEasy: number | null;
  bestTimeMedium: number | null;
  bestTimeHard: number | null;
}

const emptyStats: SerpentineStats = {
  played: 0,
  solved: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastSolvedDate: null,
  bestTimeEasy: null,
  bestTimeMedium: null,
  bestTimeHard: null,
};

const daily = createDailyPersistence<DayProgress, SerpentineStats>({
  gameId: "serpentine",
  emptyStats,
  validDay: (saved) =>
    typeof saved.difficulty === "string" &&
    typeof saved.puzzleId === "string" &&
    Array.isArray(saved.cells),
  dayKey: (day) => `${day.difficulty}:${day.dateKey}`,
});

export const {
  loadDay,
  saveDay,
  loadStats,
  updateStats,
  recordStarted,
  loadCoachSeen,
  markCoachSeen,
} = daily;

export const store = daily.store;

export function loadDailyProgress(
  difficulty: Difficulty,
  dateKey: string,
): Promise<DayProgress | null> {
  return daily.loadDay(`${difficulty}:${dateKey}`);
}

export function saveDailyProgress(progress: DayProgress): Promise<void> {
  return daily.saveDay(progress);
}

export async function loadAllDailyProgress(): Promise<
  Record<string, ArchivedDay>
> {
  const keys = await store.keys("daily:");
  const result: Record<string, ArchivedDay> = {};
  for (const key of keys) {
    const saved = await store.get<DayProgress>(key);
    if (saved && typeof saved === "object" && saved.dateKey) {
      const k = `${saved.difficulty}:${saved.dateKey}`;
      result[k] = {
        ...saved,
        stale: (saved.dictVersion ?? 0) < DICT_VERSION,
        foundWords: saved.solved ? [saved.puzzleId] : [],
      };
    }
  }
  return result;
}

export async function resetDailyForReplay(
  difficulty: Difficulty,
  dateKey: string,
) {
  await store.set(`daily:${difficulty}:${dateKey}`, {
    dateKey,
    difficulty,
    dictVersion: DICT_VERSION,
    cells: [],
    solved: false,
    elapsedMs: 0,
    puzzleId: "",
  });
}

export function displayStreak(
  stats: SerpentineStats,
  today?: string,
): number {
  return _displayStreak(stats, today);
}

export const ARCHIVE_EPOCH = "2026-07-10";
