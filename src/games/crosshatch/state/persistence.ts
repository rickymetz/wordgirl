import {
  createDailyPersistence,
  displayStreak,
  streakAdvance,
} from "../../../lib/daily/persistence";
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
  /** The day's distinct-word total, stored so the archive can rank
   * without regenerating the puzzle. */
  totalWords?: number;
  /** Reached the solve threshold (SOLVE_PCT of all combos). */
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

const base = createDailyPersistence<DailyProgress, CrosshatchStats>({
  gameId: "crosshatch",
  emptyStats: EMPTY_STATS,
  validDay: (s) =>
    Array.isArray(s.foundWords) &&
    s.grid !== null &&
    typeof s.grid === "object" &&
    (s.revealed === undefined ||
      (s.revealed !== null && typeof s.revealed === "object")),
  // Found words only ever GROW within a day: a stored save holding
  // words this tab doesn't know about means another tab is ahead.
  allowUnsolvedWrite: (stored, progress) =>
    !(
      stored.foundWords.length > progress.foundWords.length &&
      stored.foundWords.some((w) => !progress.foundWords.includes(w))
    ),
});
const store = base.store;


/** The first daily puzzle — the archive reaches back to here. */
export const ARCHIVE_EPOCH = "2026-07-06";

function validShape(saved: DailyProgress | null): DailyProgress | null {
  return base.validShape(saved);
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

export function saveDailyProgress(progress: DailyProgress) {
  return base.saveDay(progress);
}

/** Wipe a solved day for a fresh replay run; stats stay counted.
 * Writes directly — the multi-tab guard must not "protect" the old
 * run from a deliberate reset. */
export async function resetDailyForReplay(dateKey: string) {
  await store.set(`daily:${dateKey}`, {
    dateKey,
    dictVersion: DICT_VERSION,
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

export const loadStats = base.loadStats;

/** Call once when a new daily puzzle is first opened. */
export const recordDailyStarted = base.recordStarted;

const rankIndex = (r: RankTitle | null) =>
  r === null ? -1 : RANKS.findIndex((x) => x.title === r);

/**
 * Call once when a daily puzzle reaches the solve threshold. Only
 * TODAY's puzzle moves the streak — solving an archived day counts
 * toward totals but must not rewrite streak history, and lastSolvedDate
 * never moves BACKWARD (westward timezone travel would otherwise reset
 * a streak).
 */
export function recordDailySolved(
  dateKey: string,
  wordsFound: number,
  rank: RankTitle,
  // The grace day exists for a DAILY session frozen across midnight;
  // an archive play of yesterday must not borrow it to move the streak.
  allowGrace = true,
): Promise<CrosshatchStats> {
  return base.updateStats((stats) => {
    if (stats.lastSolvedDate === dateKey) return stats; // already recorded
    return {
      ...stats,
      solved: stats.solved + 1,
      bestRank:
        rankIndex(rank) > rankIndex(stats.bestRank) ? rank : stats.bestRank,
      totalWords: stats.totalWords + wordsFound,
      ...streakAdvance(stats, dateKey, allowGrace),
    };
  });
}

/**
 * The rank can still improve AFTER the solve is recorded (pushing from
 * Genius to a perfect Crosshatch) — upgrade bestRank without touching
 * the counters.
 */
export async function recordRankImproved(rank: RankTitle): Promise<void> {
  await base.updateStats((stats) =>
    rankIndex(rank) > rankIndex(stats.bestRank)
      ? { ...stats, bestRank: rank }
      : stats,
  );
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
