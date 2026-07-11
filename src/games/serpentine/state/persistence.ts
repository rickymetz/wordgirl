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

export interface ArchivedDay {
  dateKey: string;
  solved: boolean;
  stale: boolean;
  elapsedMs: number;
  cellCount: number;
  foundWords: string[];
  solvedHour: number | null;
}

export interface SerpentineStats extends StreakStats {
  bestTimeHaiku: number | null;
  bestTimePoem: number | null;
}

const emptyStats: SerpentineStats = {
  played: 0,
  solved: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastSolvedDate: null,
  bestTimeHaiku: null,
  bestTimePoem: null,
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
  validShape,
} = daily;

export const store = daily.store;

export function loadDailyProgress(
  difficulty: Difficulty,
  dateKey: string,
): Promise<DayProgress | null> {
  return daily.loadDay(`${difficulty}:${dateKey}`);
}

export function loadStaleDailyProgress(
  difficulty: Difficulty,
  dateKey: string,
): Promise<DayProgress | null> {
  return daily.loadStaleDay(`${difficulty}:${dateKey}`);
}

export function saveDailyProgress(progress: DayProgress): Promise<void> {
  return daily.saveDay(progress);
}

export async function loadAllDailyProgress(): Promise<
  Record<string, ArchivedDay>
> {
  const byDate: Record<string, DayProgress[]> = {};
  for (const key of await store.keys("daily:")) {
    const saved = validShape(await store.get<DayProgress>(key));
    if (saved && saved.dateKey) {
      (byDate[saved.dateKey] ??= []).push(saved);
    }
  }
  const out: Record<string, ArchivedDay> = {};
  for (const [dateKey, saves] of Object.entries(byDate)) {
    const solvedSaves = saves.filter((s) => s.solved);
    const started = saves.some((s) => s.cells.length > 0);
    out[dateKey] = {
      dateKey,
      solved: solvedSaves.length > 0,
      stale: saves.some((s) => (s.dictVersion ?? 0) !== DICT_VERSION),
      elapsedMs: solvedSaves.reduce((a, s) => a + s.elapsedMs, 0),
      cellCount: started
        ? Math.max(...saves.map((s) => s.cells.length))
        : 0,
      foundWords: solvedSaves.map((s) => s.puzzleId),
      solvedHour: solvedSaves.length > 0
        ? ((solvedSaves[0] as unknown as Record<string, unknown>).solvedHour as number) ?? null
        : null,
    };
  }
  return out;
}

export async function resetDailyForReplay(
  difficulty: Difficulty,
  dateKey: string,
  puzzleId: string,
) {
  await store.set(`daily:${difficulty}:${dateKey}`, {
    dateKey,
    difficulty,
    dictVersion: DICT_VERSION,
    cells: [],
    solved: false,
    elapsedMs: 0,
    puzzleId,
    statsRecorded: true,
  });
}

export function displayStreak(
  stats: SerpentineStats,
  today?: string,
): number {
  return _displayStreak(stats, today);
}

export const ARCHIVE_EPOCH = "2026-07-10";
