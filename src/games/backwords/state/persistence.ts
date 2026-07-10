import { createGameStore } from "../../../lib/storage/createGameStore";
import { localDateKey, previousDateKey } from "../../../lib/date";
import { DICT_VERSION } from "../../../lib/words/dictionary";

export interface DailyProgress {
  dateKey: string;
  dictVersion: number;
  /** Committed placements, in the order they were laid. */
  rows: string[];
  solved: boolean;
  /** Active play time across sessions, frozen at the solve. */
  elapsedMs: number;
  /** Set when this date's solve already counted toward stats. */
  statsRecorded?: boolean;
}

export interface BackwordsStats {
  played: number;
  solved: number;
  currentStreak: number;
  bestStreak: number;
  lastSolvedDate: string | null;
  /** Fastest daily solve. */
  bestTimeMs: number | null;
  /** Lifetime ✦ rows — placements a real mirror would render. */
  glyphRows: number;
}

const EMPTY_STATS: BackwordsStats = {
  played: 0,
  solved: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastSolvedDate: null,
  bestTimeMs: null,
  glyphRows: 0,
};

const store = createGameStore("backwords");

/** Serialize read-modify-write stats updates (see crosshatch). */
let statsLock: Promise<unknown> = Promise.resolve();
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = statsLock.then(fn, fn);
  statsLock = run.catch(() => {});
  return run;
}

/** The first daily puzzle — the archive reaches back to here. */
export const ARCHIVE_EPOCH = "2026-07-10";

/** A partially-corrupted save must not crash hydration. */
function validShape(saved: DailyProgress | null): DailyProgress | null {
  if (!saved || typeof saved !== "object") return null;
  if (!Array.isArray(saved.rows)) return null;
  if (saved.rows.some((r) => typeof r !== "string")) return null;
  if (typeof saved.elapsedMs !== "number" || !Number.isFinite(saved.elapsedMs)) {
    return null;
  }
  return saved;
}

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
  stale: boolean;
  /** GameArchive's shared contract exposes foundWords; rows map to it. */
  foundWords: string[];
}

export async function loadAllDailyProgress(): Promise<
  Record<string, ArchivedDay>
> {
  const out: Record<string, ArchivedDay> = {};
  for (const key of await store.keys("daily:")) {
    const saved = validShape(await store.get<DailyProgress>(key));
    if (saved) {
      out[saved.dateKey] = {
        ...saved,
        foundWords: saved.rows,
        stale: saved.dictVersion !== DICT_VERSION,
      };
    }
  }
  return out;
}

export async function saveDailyProgress(
  progress: DailyProgress,
  opts?: {
    /** This tab committed or broke a row itself — its rows are the
     * truth even when they've shrunk back to zero. */
    rowsEdited?: boolean;
  },
) {
  const stored = validShape(
    await store.get<DailyProgress>(`daily:${progress.dateKey}`),
  );
  // A tab running an OLDER build must never clobber a newer build's
  // save — dictVersion only ever grows.
  if (stored && stored.dictVersion > progress.dictVersion) return;
  if (stored && stored.dictVersion === progress.dictVersion) {
    // Multi-tab guard, part 1: a finished day is final (the clock
    // stopped there) — a stale tab's flush must not overwrite it
    // with an unsolved board.
    if (stored.solved && !progress.solved) return;
    // Part 2: rows legitimately SHRINK here (breakRow), so crosshatch's
    // growth check can't apply — instead, a tab that never edited a
    // row itself has no claim over stored rows AT ALL. It may only
    // refresh a save whose rows it agrees with (elapsed-time updates);
    // any divergence means another tab moved the day.
    if (
      !progress.solved &&
      !opts?.rowsEdited &&
      stored.rows.join("\n") !== progress.rows.join("\n")
    ) {
      return;
    }
  }
  await store.set(`daily:${progress.dateKey}`, progress);
}

/** Wipe a solved day for a fresh replay run; stats stay counted.
 * Writes directly — the multi-tab guard must not "protect" the old
 * run from a deliberate reset. */
export async function resetDailyForReplay(dateKey: string) {
  await store.set(`daily:${dateKey}`, {
    dateKey,
    dictVersion: DICT_VERSION,
    rows: [],
    solved: false,
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

export async function loadStats(): Promise<BackwordsStats> {
  // Merge over defaults so stats survive schema additions.
  const saved = await store.get<Partial<BackwordsStats>>("stats");
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
 * Call once when a daily board completes. Only TODAY's puzzle moves
 * the streak and the best time — an archive play counts toward totals
 * but must not rewrite streak history or claim a time record, and
 * lastSolvedDate never moves backward.
 */
export function recordDailySolved(
  dateKey: string,
  elapsedMs: number,
  glyphRows: number,
  // The grace day exists for a DAILY session frozen across midnight;
  // an archive play of yesterday must not borrow it.
  allowGrace = true,
): Promise<BackwordsStats> {
  return serialized(async () => {
    const stats = await loadStats();
    if (stats.lastSolvedDate === dateKey) return stats; // already recorded

    const today = localDateKey();
    const isToday =
      dateKey === today || (allowGrace && dateKey === previousDateKey(today));
    const advances =
      isToday &&
      (stats.lastSolvedDate === null || dateKey > stats.lastSolvedDate);
    const continues = stats.lastSolvedDate === previousDateKey(dateKey);
    const currentStreak = continues ? stats.currentStreak + 1 : 1;

    const next: BackwordsStats = {
      ...stats,
      solved: stats.solved + 1,
      glyphRows: stats.glyphRows + glyphRows,
      ...(isToday && {
        bestTimeMs:
          stats.bestTimeMs === null
            ? elapsedMs
            : Math.min(stats.bestTimeMs, elapsedMs),
      }),
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

/**
 * The streak to DISPLAY: stats.currentStreak is only rewritten on the
 * next solve, so a lapsed streak would show its old value forever.
 */
export function displayStreak(
  stats: BackwordsStats,
  today = localDateKey(),
): number {
  if (!stats.lastSolvedDate) return 0;
  return stats.lastSolvedDate >= previousDateKey(today)
    ? stats.currentStreak
    : 0;
}
