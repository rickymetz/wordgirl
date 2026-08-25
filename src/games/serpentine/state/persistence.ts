import {
  createDailyPersistence,
  displayStreak as _displayStreak,
  everyOtherBoardSolved,
  isFirstBoardOfDay,
  type DailyBase,
  type StreakStats,
} from "../../../lib/daily/persistence";
import { puzzleKey as makePuzzleKey } from "../../../lib/puzzleKey";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { DIFFICULTIES, type Cell, type Difficulty, type PuzzleDef } from "../engine/types";

export interface DayProgress extends DailyBase {
  dateKey: string;
  difficulty: Difficulty;
  puzzleId: string;
  cells: Cell[];
  hints?: number;
  solvedHour?: number | null;
}

export interface ArchivedDay {
  dateKey: string;
  solved: boolean;
  stale: boolean;
  /** Summed across the day's solved boards — see `solvedCount`. */
  elapsedMs: number;
  /** Furthest traced on any board, solved or not (archive progress). */
  cellCount: number;
  /** Letters in the longest board SOLVED, or null if none was. */
  solvedCellCount: number | null;
  /** How many of the day's two boards were solved (0–2). */
  solvedCount: number;
  foundWords: string[];
  solvedHour: number | null;
  hints: number | null;
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

/** Deterministic fingerprint of a Serpentine puzzle's identity. */
export function serpentinePuzzleKey(puzzle: PuzzleDef): string {
  return makePuzzleKey({ id: puzzle.id, grid: puzzle.grid, text: puzzle.text });
}

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
  loadTutorialSeen,
  markTutorialSeen,
  validShape,
} = daily;

export const store = daily.store;

export function loadDailyProgress(
  difficulty: Difficulty,
  dateKey: string,
  currentPuzzleKey?: string,
): Promise<DayProgress | null> {
  return daily.loadDay(`${difficulty}:${dateKey}`, currentPuzzleKey);
}

/**
 * Is the rest of the date's boards solved — i.e. does solving THIS one
 * finish the day? The streak belongs to the day, which is both boards,
 * matching what the hub card has always called "done". It used to
 * advance on whichever board was solved first, so a player who only
 * ever did the haiku kept a streak the card never called finished.
 */
export function otherBoardsSolved(
  dateKey: string,
  difficulty: Difficulty,
): Promise<boolean> {
  return everyOtherBoardSolved(DIFFICULTIES, difficulty, (d) =>
    boardRecord(dateKey, d),
  );
}

/** The RECORD of a board on a date, whatever version wrote it — the
 * day-completion questions here are about history, not resumability
 * (see loadDayRecord). */
function boardRecord(dateKey: string, difficulty: Difficulty) {
  return daily.loadDayRecord(`${difficulty}:${dateKey}`);
}

/** Were BOTH of the date's boards solved — the RECORD, version-insensitive
 *  (history doesn't un-happen on a dict bump), for the cross-game
 *  "all games done" streak. */
export async function isDaySolved(dateKey: string): Promise<boolean> {
  const boards = await Promise.all(
    DIFFICULTIES.map((d) => boardRecord(dateKey, d)),
  );
  return boards.every((b) => b?.solved === true);
}

/**
 * Call when a board of a new daily is first opened. `played` counts
 * DAYS, not boards — the two boards of one date are one day's play — so
 * the other board opened later must not count again.
 *
 * Returns whether the day was counted, so the analytics `started` event
 * can fire on exactly the same condition instead of once per board.
 */
export async function recordDailyStarted(
  dateKey: string,
  difficulty: Difficulty,
): Promise<boolean> {
  const first = await isFirstBoardOfDay(DIFFICULTIES, difficulty, (d) =>
    boardRecord(dateKey, d),
  );
  if (!first) return false;
  await daily.recordStarted();
  return true;
}

export function loadStaleDailyProgress(
  difficulty: Difficulty,
  dateKey: string,
  currentPuzzleKey?: string,
): Promise<DayProgress | null> {
  return daily.loadStaleDay(`${difficulty}:${dateKey}`, currentPuzzleKey);
}

export function saveDailyProgress(progress: DayProgress): Promise<void> {
  return daily.saveDay(progress);
}

/**
 * True when a save holds more than the puzzle's given first letter.
 *
 * Every board now opens with one cell already traced, and merely opening
 * a day can write that state — so "has any cells" would report an
 * untouched day as played, on the hub and in the archive alike.
 */
export function hasProgress(
  save: Pick<DayProgress, "cells"> | null | undefined,
): boolean {
  return !!save && save.cells.length > 1;
}

export async function loadAllDailyProgress(): Promise<
  Record<string, ArchivedDay>
> {
  // Two boards a day, so a date's saves arrive as a group of one or two.
  const byDate = await daily.loadDaysByDate();
  const out: Record<string, ArchivedDay> = {};
  for (const [dateKey, saves] of Object.entries(byDate)) {
    const solvedSaves = saves.filter((s) => s.solved);
    const started = saves.some(hasProgress);
    out[dateKey] = {
      dateKey,
      // The DAY, not any board of it — the same rule the hub card, the
      // streak and Doublet's archive use. This said "any board solved",
      // so the calendar called a haiku-only date finished while every
      // other surface said it wasn't.
      solved: solvedSaves.length === DIFFICULTIES.length,
      stale: saves.some((s) => !s.puzzleKey && (s.dictVersion ?? 0) !== DICT_VERSION),
      elapsedMs: solvedSaves.reduce((a, s) => a + s.elapsedMs, 0),
      cellCount: started
        ? Math.max(...saves.map((s) => s.cells.length))
        : 0,
      // The longest phrase actually SOLVED that day. cellCount above is
      // the furthest the player traced on any board, solved or not, which
      // the archive wants (it measures progress) and the stats page must
      // not have: a part-traced Poem would report a puzzle length that was
      // never completed on a day the Haiku alone was solved.
      solvedCellCount:
        solvedSaves.length > 0
          ? Math.max(...solvedSaves.map((s) => s.cells.length))
          : null,
      solvedCount: solvedSaves.length,
      foundWords: solvedSaves.map((s) => s.puzzleId),
      solvedHour: solvedSaves.length > 0
        ? solvedSaves[0].solvedHour ?? null
        : null,
      hints: solvedSaves.length > 0 && saves.every((s) => s.hints !== undefined)
        ? saves.reduce((a, s) => a + (s.hints ?? 0), 0)
        : null,
    };
  }
  return out;
}

export async function resetDailyForReplay(
  difficulty: Difficulty,
  dateKey: string,
  puzzleId: string,
  currentPuzzleKey?: string,
) {
  await store.set(`daily:${difficulty}:${dateKey}`, {
    dateKey,
    difficulty,
    dictVersion: DICT_VERSION,
    ...(currentPuzzleKey && { puzzleKey: currentPuzzleKey }),
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
