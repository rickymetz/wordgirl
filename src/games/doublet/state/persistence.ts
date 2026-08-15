import {
  createDailyPersistence,
  displayStreak,
  everyOtherBoardSolved,
  streakAdvance,
  sumAcrossBoards,
  type DailyBase,
  type StreakStats,
} from "../../../lib/daily/persistence";
import { puzzleKey as makePuzzleKey } from "../../../lib/puzzleKey";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import {
  DIFFICULTIES,
  type Difficulty,
  type DoubletPuzzle,
  type PlacedDomino,
} from "../engine/types";

export interface DailyProgress extends DailyBase {
  difficulty: Difficulty;
  placed: PlacedDomino[];
  foundWords: string[];
  /** Trend counters (absent on saves from before they shipped). */
  moves?: number;
  rotations?: number;
  removals?: number;
  invalidBoards?: number;
  hints?: number;
  /** Opens of this board while unsolved. */
  sessions?: number;
  /** Local hour (0-23) this board was solved. */
  solvedHour?: number;
}

export type DoubletStats = StreakStats;

const EMPTY_STATS: DoubletStats = {
  played: 0,
  solved: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastSolvedDate: null,
};

export const ARCHIVE_EPOCH = "2026-07-10";

const base = createDailyPersistence<DailyProgress, DoubletStats>({
  gameId: "doublet",
  emptyStats: EMPTY_STATS,
  validDay: (s) => Array.isArray(s.placed),
  // Three boards a day: saves key by difficulty AND date.
  dayKey: (day) => `${day.difficulty}:${day.dateKey}`,
});

/** Fingerprint the fields that define a Doublet puzzle's identity. */
export function doubletPuzzleKey(puzzle: DoubletPuzzle): string {
  return makePuzzleKey({
    board: puzzle.board,
    slots: puzzle.slots,
    dominoes: puzzle.dominoes,
  });
}

export const loadDailyProgress = (
  dateKey: string,
  difficulty: Difficulty,
  currentPuzzleKey?: string,
) => base.loadDay(`${difficulty}:${dateKey}`, currentPuzzleKey);
export const loadStaleDailyProgress = (
  dateKey: string,
  difficulty: Difficulty,
  currentPuzzleKey?: string,
) => base.loadStaleDay(`${difficulty}:${dateKey}`, currentPuzzleKey);
export const saveDailyProgress = base.saveDay;
export const { loadCoachSeen, markCoachSeen, loadStats } = base;
export const { loadTutorialSeen, markTutorialSeen } = base;
export const recordDailyStarted = base.recordStarted;
export { displayStreak };

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
  /** Summed trend counters — null for days saved before tracking
   * shipped (a legacy day must not chart as zero). */
  moves: number | null;
  rotations: number | null;
  removals: number | null;
  invalidBoards: number | null;
  hints: number | null;
  sessions: number | null;
  /** An hour one of the day's boards was solved at (any board — the
   * histogram wants "when do I play", not per-board precision). */
  solvedHour: number | null;
  /** GameArchive's played contract: all boards' words, merged. */
  foundWords: string[];
}

/** The counters a day sums across its boards (solvedHour merges, not
 * sums). One list drives the null-init, the sum, and the gap rule. */
const COUNTER_KEYS = [
  "moves",
  "rotations",
  "removals",
  "invalidBoards",
  "hints",
  "sessions",
] as const;

export async function loadAllDailyProgress(): Promise<
  Record<string, ArchivedDay>
> {
  // Grouped by date: counters only chart when EVERY one of the date's
  // boards carries them — a day mixing pre-tracking and tracked saves
  // would otherwise present a partial sum as the day's total (as fake
  // as a zero), so it stays a gap. See sumAcrossBoards.
  const byDate = await base.loadDaysByDate();
  const out: Record<string, ArchivedDay> = {};
  for (const [dateKey, saves] of Object.entries(byDate)) {
    const day: ArchivedDay = {
      dateKey,
      solvedCount: saves.filter((s) => s.solved).length,
      startedCount: saves.filter((s) => s.solved || s.placed.length > 0)
        .length,
      stale: saves.some((s) => !s.puzzleKey && s.dictVersion !== DICT_VERSION),
      elapsedMs: saves.reduce((a, s) => a + s.elapsedMs, 0),
      moves: null,
      rotations: null,
      removals: null,
      invalidBoards: null,
      hints: null,
      sessions: null,
      solvedHour:
        saves.map((s) => s.solvedHour).find((h) => h !== undefined) ?? null,
      foundWords: saves.flatMap((s) => s.foundWords ?? []),
    };
    for (const k of COUNTER_KEYS) {
      day[k] = sumAcrossBoards(saves, (s) => s[k]);
    }
    out[dateKey] = day;
  }
  return out;
}

export async function resetDailyForReplay(
  dateKey: string,
  difficulty: Difficulty,
  currentPuzzleKey?: string,
) {
  await base.store.set(`daily:${difficulty}:${dateKey}`, {
    dateKey,
    difficulty,
    dictVersion: DICT_VERSION,
    ...(currentPuzzleKey && { puzzleKey: currentPuzzleKey }),
    placed: [],
    solved: false,
    elapsedMs: 0,
    statsRecorded: true,
    foundWords: [],
  } satisfies DailyProgress);
}

/**
 * Call once per solved BOARD (the hook's statsRecorded marker guards
 * replays and re-opens): `solved` counts boards, matching `played`
 * from recordDailyStarted. The STREAK counts DAYS, and a day is every
 * board — see below.
 */
export async function recordDailySolved(
  dateKey: string,
  difficulty: Difficulty,
  allowGrace = true,
): Promise<DoubletStats> {
  // The STREAK belongs to the day, and the day is all three boards —
  // the same rule the hub card has always used for "done". It used to
  // advance on whichever board you solved first, so a player who only
  // ever played easy kept a streak the card never called finished.
  const dayComplete = await everyOtherBoardSolved(
    DIFFICULTIES,
    difficulty,
    (d) => loadDailyProgress(dateKey, d),
  );
  return base.updateStats((stats) => ({
    ...stats,
    // `solved` still counts BOARDS, matching `played` from
    // recordDailyStarted — only the streak moved to the day.
    solved: stats.solved + 1,
    ...(dayComplete ? streakAdvance(stats, dateKey, allowGrace) : {}),
  }));
}
