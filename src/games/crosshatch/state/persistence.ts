import {
  createDailyPersistence,
  displayStreak,
  streakAdvance,
  sumAcrossBoards,
} from "../../../lib/daily/persistence";
import { puzzleKey as makePuzzleKey } from "../../../lib/puzzleKey";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import type { CrosshatchPuzzle, Level } from "../engine/types";

export interface DailyProgress {
  dateKey: string;
  /** Which board this save is. ABSENT on every save written before the
   * hard board shipped — those are all normal, and `levelOf` is the
   * only place that assumption lives. */
  level?: Level;
  dictVersion: number;
  /** Deterministic fingerprint of the puzzle — survives unrelated
   * DICT_VERSION bumps. Legacy saves lack this field. */
  puzzleKey?: string;
  /** Distinct words banked so far, in the order they were found. */
  foundWords: string[];
  /** Player-typed letters still on the grid, cell key -> letter. */
  grid: Record<string, string>;
  /** Hint reveals: word -> revealed letter positions. */
  revealed: Record<string, number[]>;
  /** The day's distinct-word total, stored so the archive can rank
   * without regenerating the puzzle. */
  totalWords?: number;
  /** All words found. */
  solved: boolean;
  /** Wall-clock play time across sessions, frozen at the solve moment. */
  elapsedMs: number;
  /**
   * Set when this date's solve already counted toward stats — a replay
   * must not increment totals again.
   */
  statsRecorded?: boolean;
  /** Words already credited to stats.totalWords, so post-solve finds
   * keep counting exactly once across sessions. */
  statsWords?: number;
  /** Trend counters, absent on saves from before they shipped
   * (legacy days chart as gaps, never fake zeros). */
  sessions?: number;
  invalids?: number;
  /** Local hour (0-23) the solve threshold was crossed. */
  solvedHour?: number;
}

export interface CrosshatchStats {
  played: number;
  solved: number;
  currentStreak: number;
  bestStreak: number;
  lastSolvedDate: string | null;
  totalWords: number;
}

const EMPTY_STATS: CrosshatchStats = {
  played: 0,
  solved: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastSolvedDate: null,
  totalWords: 0,
};

/**
 * A save's board. Anything that isn't the hard board IS the normal
 * board — not just an absent `level` (every save written before the
 * hard board shipped) but any unrecognised value, including the
 * `"standard"` this level was briefly called. Written this way round so
 * a renamed or unknown level can never route a save to a key nothing
 * reads, which would look exactly like lost progress.
 */
export const levelOf = (day: DailyProgress): Level =>
  day.level === "hard" ? "hard" : "normal";

/**
 * Storage sub-key for a board. The NORMAL board keeps the bare
 * dateKey it has always used — prefixing it would orphan every save on
 * every player's device — so only the hard board carries a prefix.
 */
function subKey(dateKey: string, level: Level): string {
  return level === "normal" ? dateKey : `${level}:${dateKey}`;
}

const base = createDailyPersistence<DailyProgress, CrosshatchStats>({
  gameId: "crosshatch",
  emptyStats: EMPTY_STATS,
  dayKey: (day) => subKey(day.dateKey, levelOf(day)),
  validDay: (s) =>
    Array.isArray(s.foundWords) &&
    s.grid !== null &&
    typeof s.grid === "object" &&
    (s.revealed === undefined ||
      (s.revealed !== null && typeof s.revealed === "object")),
  // Found words only ever GROW within a day: a stored save holding
  // words this tab doesn't know about means another tab is ahead. The
  // counters ride the same save and are monotonic too — a tab with a
  // stale (smaller) count must not regress a fresher one.
  allowUnsolvedWrite: (stored, progress) =>
    !(
      stored.foundWords.length > progress.foundWords.length &&
      stored.foundWords.some((w) => !progress.foundWords.includes(w))
    ) &&
    (progress.invalids ?? 0) >= (stored.invalids ?? 0) &&
    (progress.sessions ?? 0) >= (stored.sessions ?? 0),
});
const store = base.store;

export function crosshatchPuzzleKey(puzzle: CrosshatchPuzzle): string {
  return makePuzzleKey([puzzle.givens, puzzle.combos]);
}

/** The first daily puzzle — the archive reaches back to here. */
export const ARCHIVE_EPOCH = "2026-07-06";

/**
 * The first date that has a HARD board. Days before it are one-board
 * days, for good: a player who solved 2026-07-20 finished everything
 * that date had, and a second board invented afterwards must not
 * retroactively turn that day — or the streak it fed — unsolved.
 *
 * So this gates the hard board's EXISTENCE, not just its scoring: the
 * archive offers a hard board from here forward and nowhere earlier,
 * which is also the only version a player can reason about ("the hard
 * board started on the 15th").
 */
export const HARD_EPOCH = "2026-08-15";

/** Boards a date carries, in board order. */
export function levelsFor(dateKey: string): Level[] {
  return dateKey >= HARD_EPOCH ? ["normal", "hard"] : ["normal"];
}

export function hasHardBoard(dateKey: string): boolean {
  return dateKey >= HARD_EPOCH;
}

/**
 * DICT_VERSION at which crosshatch's own puzzle derivation last
 * changed (v17: generate from the required tier). Every save below it
 * describes a puzzle that no longer exists for its date. The archive
 * listing can't detect that from `puzzleKey` — it would have to
 * regenerate all 200+ puzzles to compare — so the version is the
 * marker. Raise this ONLY when crosshatch generation itself changes;
 * an unrelated game's bump must keep resolving through puzzleKey.
 */
const GENERATOR_VERSION = 17;

/**
 * The playable save for a date, or null. Saves whose puzzle no longer
 * matches can't be resumed — use loadStaleDailyProgress for historical
 * records. Pass `currentPuzzleKey` so an unrelated DICT_VERSION bump
 * doesn't discard progress when the crosshatch puzzle is unchanged.
 */
export function loadDailyProgress(
  dateKey: string,
  level: Level = "normal",
  currentPuzzleKey?: string,
): Promise<DailyProgress | null> {
  return base.loadDay(subKey(dateKey, level), currentPuzzleKey);
}

/** A save from an older/different puzzle, kept as a historical record. */
export function loadStaleDailyProgress(
  dateKey: string,
  level: Level = "normal",
  currentPuzzleKey?: string,
): Promise<DailyProgress | null> {
  return base.loadStaleDay(subKey(dateKey, level), currentPuzzleKey);
}

/** Is every board this date carries solved? The day is the unit of
 * progress: both boards, or the one board a pre-HARD_EPOCH day has. */
export async function isDaySolved(dateKey: string): Promise<boolean> {
  const boards = await Promise.all(
    levelsFor(dateKey).map((level) => loadDailyProgress(dateKey, level)),
  );
  return boards.every((b) => b?.solved === true);
}

/**
 * A DATE's roll-up across its boards — GameArchive and GameTrends both
 * look days up by plain dateKey, so the per-board saves merge here.
 */
export interface ArchivedDay {
  dateKey: string;
  /** Boards this date carries (1 before HARD_EPOCH, 2 after). */
  boards: number;
  /** Boards solved (0-2) and boards with any progress on them. */
  solvedCount: number;
  startedCount: number;
  /** The DAY is solved when every board it carries is. */
  solved: boolean;
  /** Every board's finds, merged — GameArchive's played contract. */
  foundWords: string[];
  /** The day's word total across boards, or undefined when any board's
   * save predates the field (a partial total would mis-rank the day). */
  totalWords?: number;
  /** Active time summed across boards. */
  elapsedMs: number;
  /** True when any board's save is a legacy record with no puzzleKey. */
  stale: boolean;
  /** True when any board's puzzle has been regenerated since. */
  retired: boolean;
  /** Counters summed across boards — null when ANY board's save
   * predates the counter, since a partial sum presented as the day's
   * total is as fake as a zero (a legacy day charts as a GAP). */
  hintLetters: number | null;
  invalids: number | null;
  sessions: number | null;
  /** An hour one of the day's boards was solved at. */
  solvedHour: number | null;
}

/** Hint letters spent on a board, or undefined where the save predates
 * the field — the distinction between "used none" and "unknown". */
const hintLettersOf = (s: DailyProgress): number | undefined =>
  s.revealed === undefined
    ? undefined
    : Object.values(s.revealed).reduce((a, p) => a + p.length, 0);

/** Every saved daily, rolled up by date — drives the archive listing. */
export async function loadAllDailyProgress(): Promise<
  Record<string, ArchivedDay>
> {
  const byDate = await base.loadDaysByDate();
  const out: Record<string, ArchivedDay> = {};
  for (const [dateKey, saves] of Object.entries(byDate)) {
    const boards = levelsFor(dateKey);
    out[dateKey] = {
      dateKey,
      boards: boards.length,
      solvedCount: saves.filter((s) => s.solved).length,
      startedCount: saves.filter(
        (s) => s.solved || s.foundWords.length > 0 || hasReveals(s),
      ).length,
      // Every board the DATE carries must be solved — not merely every
      // board that happens to have a save, or a day whose hard board
      // was never opened would read as finished.
      solved: boards.every((level) =>
        saves.some((s) => levelOf(s) === level && s.solved),
      ),
      foundWords: saves.flatMap((s) => s.foundWords),
      totalWords:
        sumAcrossBoards(saves, (s) => s.totalWords) ?? undefined,
      elapsedMs: saves.reduce((a, s) => a + s.elapsedMs, 0),
      stale: saves.some((s) => !s.puzzleKey && s.dictVersion !== DICT_VERSION),
      retired: saves.some((s) => s.dictVersion < GENERATOR_VERSION),
      hintLetters: sumAcrossBoards(saves, hintLettersOf),
      invalids: sumAcrossBoards(saves, (s) => s.invalids),
      sessions: sumAcrossBoards(saves, (s) => s.sessions),
      solvedHour:
        saves.map((s) => s.solvedHour).find((h) => h !== undefined) ?? null,
    };
  }
  return out;
}

function hasReveals(s: DailyProgress): boolean {
  return Object.keys(s.revealed ?? {}).length > 0;
}

export function saveDailyProgress(progress: DailyProgress) {
  return base.saveDay(progress);
}

/** Wipe a solved day for a fresh replay run; stats stay counted.
 * Writes directly — the multi-tab guard must not "protect" the old
 * run from a deliberate reset. */
export async function resetDailyForReplay(
  dateKey: string,
  level: Level = "normal",
  currentPuzzleKey?: string,
) {
  await store.set(`daily:${subKey(dateKey, level)}`, {
    dateKey,
    level,
    dictVersion: DICT_VERSION,
    ...(currentPuzzleKey && { puzzleKey: currentPuzzleKey }),
    foundWords: [],
    grid: {},
    revealed: {},
    solved: false,
    elapsedMs: 0,
    statsRecorded: true,
  } satisfies DailyProgress);
}

/** One-time first-run coach marks. */
export const { loadCoachSeen, markCoachSeen } = base;
export const { loadTutorialSeen, markTutorialSeen } = base;

export const loadStats = base.loadStats;

/**
 * Call when a board of a new daily is first opened. `played` counts
 * DAYS, not boards — it always has, and the two boards of one date are
 * one day's play — so the second board of a date opened later must not
 * increment it again. The caller has already established that THIS
 * board has no save; this checks the date's others.
 *
 * Returns whether the day was counted, so the analytics event can fire
 * on exactly the same condition. They drifted apart the moment a day
 * had two boards: the stat counted the day, the event counted each
 * board opened, and one `started` silently became two.
 */
export async function recordDailyStarted(
  dateKey: string,
  level: Level = "normal",
): Promise<boolean> {
  const siblings = await Promise.all(
    levelsFor(dateKey)
      .filter((l) => l !== level)
      .map((l) => loadDailyProgress(dateKey, l)),
  );
  if (siblings.some((s) => s !== null)) return false;
  await base.recordStarted();
  return true;
}

/**
 * Call once when a daily puzzle reaches the solve threshold. Only
 * TODAY's puzzle moves the streak — solving an archived day counts
 * toward totals but must not rewrite streak history, and lastSolvedDate
 * never moves BACKWARD (westward timezone travel would otherwise reset
 * a streak).
 */
export async function recordDailySolved(
  dateKey: string,
  level: Level,
  wordsFound: number,
  // The grace day exists for a DAILY session frozen across midnight;
  // an archive play of yesterday must not borrow it to move the streak.
  allowGrace = true,
): Promise<CrosshatchStats> {
  // `solved` and the streak count DAYS — they always have — and a day
  // now needs every board it carries. The board that just solved may
  // not have reached storage yet (its save is written by a separate
  // effect), so ask about the date's OTHER boards and take this one as
  // solved by construction. Before HARD_EPOCH there are no others, and
  // the day completes exactly as it always did.
  const others = await Promise.all(
    levelsFor(dateKey)
      .filter((l) => l !== level)
      .map((l) => loadDailyProgress(dateKey, l)),
  );
  const dayComplete = others.every((b) => b?.solved === true);
  return base.updateStats((stats) => ({
    ...stats,
    // Words are the player's own tally: every board's finds count as
    // they're found, whether or not the day is finished.
    totalWords: stats.totalWords + wordsFound,
    ...(dayComplete && stats.lastSolvedDate !== dateKey
      ? {
          solved: stats.solved + 1,
          ...streakAdvance(stats, dateKey, allowGrace),
        }
      : {}),
  }));
}

/** Words found AFTER the solve was recorded still count toward the
 * lifetime total — credited incrementally, exactly once per word. */
export async function recordWordsProgress(delta: number): Promise<void> {
  if (delta <= 0) return;
  await base.updateStats((stats) => ({
    ...stats,
    totalWords: stats.totalWords + delta,
  }));
}

/**
 * The streak to DISPLAY: stats.currentStreak is only rewritten on the
 * next solve, so a lapsed streak would show its old value forever.
 * Solving yesterday's puzzle still counts as alive (it dies only when
 * today ends unsolved).
 */
export { displayStreak };
