import {
  createDailyPersistence,
  displayStreak,
  everyOtherBoardSolved,
  isFirstBoardOfDay,
  streakAdvance,
  sumAcrossBoards,
  type DailyBase,
  type StreakStats,
} from "../../../lib/daily/persistence";
import { puzzleKey as makePuzzleKey } from "../../../lib/puzzleKey";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import type { HintState } from "../engine/hints";
import { BOARD_KINDS, TYPESET_VERSION, type Board, type BoardKind } from "../engine/schedule";

export interface DailyProgress extends DailyBase {
  board: BoardKind;
  /** Found sets, as tripleKeys, in the order found. */
  found: string[];
  /** Total sets on the board, so the archive can read "5/7" without re-dealing. */
  total: number;
  misses: number;
  hints: number;
  /** The hint target and facts shown, so a resumed board continues the same thread. */
  hintState?: HintState;
  /** Opens of this board while unsolved. */
  sessions?: number;
  /** Local hour (0-23) this board was solved. */
  solvedHour?: number;
}

export type TypesetStats = StreakStats;

const EMPTY_STATS: TypesetStats = {
  played: 0,
  solved: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastSolvedDate: null,
};

export const ARCHIVE_EPOCH = "2026-10-07";

const base = createDailyPersistence<DailyProgress, TypesetStats>({
  gameId: "typeset",
  emptyStats: EMPTY_STATS,
  validDay: (s) => Array.isArray(s.found) && (s.board === "charset" || s.board === "faces"),
  // Two boards a day: saves key by board AND date.
  dayKey: (day) => `${day.board}:${day.dateKey}`,
});

/** Fingerprint what defines a board: its glyphs, its cards, and the derivation version. */
export function typesetPuzzleKey(board: Board): string {
  return makePuzzleKey({
    v: TYPESET_VERSION,
    glyphs: board.glyphs.map((g) => `${g.face}:${g.char}`),
    cards: board.cards,
  });
}

export const loadDailyProgress = (dateKey: string, board: BoardKind, currentPuzzleKey?: string) =>
  base.loadDay(`${board}:${dateKey}`, currentPuzzleKey);
export const loadStaleDailyProgress = (dateKey: string, board: BoardKind, currentPuzzleKey?: string) =>
  base.loadStaleDay(`${board}:${dateKey}`, currentPuzzleKey);
export const saveDailyProgress = base.saveDay;

/** The RECORD of a board on a date, whatever version wrote it. */
export const loadBoardRecord = (dateKey: string, board: BoardKind) => base.loadDayRecord(`${board}:${dateKey}`);

/** Were BOTH of the date's boards solved — the record, version-insensitive. */
export async function isDaySolved(dateKey: string): Promise<boolean> {
  const boards = await Promise.all(BOARD_KINDS.map((b) => loadBoardRecord(dateKey, b)));
  return boards.every((b) => b?.solved === true);
}

export const { loadCoachSeen, markCoachSeen, loadStats, loadTutorialSeen, markTutorialSeen } = base;
export { displayStreak };

/**
 * Call when a board of a new daily is first opened. `played` counts DAYS,
 * not boards, so the second board of a date must not count again. Returns
 * whether the day was counted, so analytics can fire on the same rule.
 */
export async function recordDailyStarted(dateKey: string, board: BoardKind): Promise<boolean> {
  const first = await isFirstBoardOfDay(BOARD_KINDS, board, (b) => loadBoardRecord(dateKey, b));
  if (!first) return false;
  await base.recordStarted();
  return true;
}

/**
 * Call once per solved board. `solved` and the streak count DAYS, and a
 * day is both boards.
 */
export async function recordDailySolved(dateKey: string, board: BoardKind, allowGrace = true): Promise<TypesetStats> {
  const dayComplete = await everyOtherBoardSolved(BOARD_KINDS, board, (b) => loadBoardRecord(dateKey, b));
  return base.updateStats((stats) => ({
    ...stats,
    ...(dayComplete && stats.lastSolvedDate !== dateKey
      ? { solved: stats.solved + 1, ...streakAdvance(stats, dateKey, allowGrace) }
      : {}),
  }));
}

export async function resetDailyForReplay(dateKey: string, board: BoardKind, total: number, currentPuzzleKey?: string) {
  await base.store.set(`daily:${board}:${dateKey}`, {
    dateKey,
    board,
    dictVersion: DICT_VERSION,
    ...(currentPuzzleKey && { puzzleKey: currentPuzzleKey }),
    found: [],
    total,
    misses: 0,
    hints: 0,
    solved: false,
    elapsedMs: 0,
    statsRecorded: true,
  } satisfies DailyProgress);
}

/**
 * A DATE's roll-up across its two boards — GameArchive and GameTrends
 * look days up by plain dateKey.
 */
export interface ArchivedDay {
  dateKey: string;
  /** Boards solved that day (0-2). */
  solvedCount: number;
  /** Boards with any progress. */
  startedCount: number;
  /** Both boards solved. */
  solved: boolean;
  stale: boolean;
  elapsedMs: number;
  /** Sets found / on the board, summed across the day's boards. */
  setsFound: number;
  setsTotal: number;
  misses: number | null;
  hints: number | null;
  sessions: number | null;
  solvedHour: number | null;
  /** GameArchive's played contract: every found set, both boards. */
  foundWords: string[];
}

export async function loadAllDailyProgress(): Promise<Record<string, ArchivedDay>> {
  const byDate = await base.loadDaysByDate();
  const out: Record<string, ArchivedDay> = {};
  for (const [dateKey, saves] of Object.entries(byDate)) {
    out[dateKey] = {
      dateKey,
      solvedCount: saves.filter((s) => s.solved).length,
      startedCount: saves.filter((s) => s.solved || s.found.length > 0).length,
      solved: BOARD_KINDS.every((b) => saves.some((s) => s.board === b && s.solved)),
      stale: saves.some((s) => !s.puzzleKey && s.dictVersion !== DICT_VERSION),
      elapsedMs: saves.reduce((a, s) => a + s.elapsedMs, 0),
      setsFound: saves.reduce((a, s) => a + s.found.length, 0),
      setsTotal: saves.reduce((a, s) => a + (s.total ?? 0), 0),
      misses: sumAcrossBoards(saves, (s) => s.misses),
      hints: sumAcrossBoards(saves, (s) => s.hints),
      sessions: sumAcrossBoards(saves, (s) => s.sessions),
      solvedHour: saves.map((s) => s.solvedHour).find((h) => h !== undefined) ?? null,
      foundWords: saves.flatMap((s) => s.found.map((k) => `${s.board}:${k}`)),
    };
  }
  return out;
}
