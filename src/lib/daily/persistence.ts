import { createGameStore } from "../storage/createGameStore";
import { localDateKey, previousDateKey } from "../date";
import { DICT_VERSION } from "../words/dictionary";

/**
 * The daily-persistence recipe every game shares, extracted so the
 * guards can never drift again (they were fixed four separate times
 * before this existed). A game's persistence.ts becomes: one
 * createDailyPersistence() call + its game-specific pieces (archive
 * roll-up shape, replay reset, the stat fields recordDailySolved
 * patches in).
 */

/** Every day save carries these; games extend with their own fields. */
export interface DailyBase {
  dateKey: string;
  dictVersion: number;
  solved: boolean;
  elapsedMs: number;
  /** Set when this save's solve already counted toward stats. */
  statsRecorded?: boolean;
}

/** Every stats blob carries these; games extend (bestTimeMs, rank…). */
export interface StreakStats {
  played: number;
  solved: number;
  currentStreak: number;
  bestStreak: number;
  lastSolvedDate: string | null;
}

export function createDailyPersistence<
  Day extends DailyBase,
  Stats extends StreakStats,
>(cfg: {
  gameId: string;
  emptyStats: Stats;
  /** Game-specific field checks beyond the shared base shape. */
  validDay: (saved: Day) => boolean;
  /** Storage sub-key under "daily:" (default: the dateKey; doublet
   * prefixes the difficulty). Must match what loadDay is called with. */
  dayKey?: (day: Day) => string;
  /** Optional extra veto for UNSOLVED writes over an existing save of
   * the same dictVersion (backwords: a non-owning tab may only refresh
   * a save whose rows it agrees with). Return false to skip the write. */
  allowUnsolvedWrite?: (
    stored: Day,
    progress: Day,
    opts: { owned?: boolean },
  ) => boolean;
}) {
  const store = createGameStore(cfg.gameId);
  const keyOf = (day: Day) => `daily:${cfg.dayKey?.(day) ?? day.dateKey}`;

  /** A partially-corrupted save must not crash hydration. */
  function validShape(saved: Day | null): Day | null {
    if (!saved || typeof saved !== "object") return null;
    if (
      typeof saved.elapsedMs !== "number" ||
      !Number.isFinite(saved.elapsedMs)
    ) {
      return null;
    }
    return cfg.validDay(saved) ? saved : null;
  }

  async function readDay(subKey: string): Promise<Day | null> {
    return validShape(await store.get<Day>(`daily:${subKey}`));
  }

  /** The current-dictionary save, or null (stale saves stay hidden). */
  async function loadDay(subKey: string): Promise<Day | null> {
    const saved = await readDay(subKey);
    if (saved && saved.dictVersion !== DICT_VERSION) return null;
    return saved;
  }

  /** A save from an OLDER dictionary, kept as a historical record. */
  async function loadStaleDay(subKey: string): Promise<Day | null> {
    const saved = await readDay(subKey);
    if (saved && saved.dictVersion !== DICT_VERSION) return saved;
    return null;
  }

  /**
   * Write a day save behind the house guards:
   * 1. an OLDER build never clobbers a newer build's save;
   * 2. a finished day is final — the clock stopped there;
   * 3. the game's own unsolved-write rule (multi-tab ownership).
   */
  async function saveDay(
    progress: Day,
    opts: { owned?: boolean } = {},
  ): Promise<void> {
    const key = keyOf(progress);
    const stored = validShape(await store.get<Day>(key));
    if (stored && stored.dictVersion > progress.dictVersion) return;
    if (stored && stored.dictVersion === progress.dictVersion) {
      if (stored.solved && !progress.solved) return;
      if (
        !progress.solved &&
        cfg.allowUnsolvedWrite &&
        !cfg.allowUnsolvedWrite(stored, progress, opts)
      ) {
        return;
      }
    }
    await store.set(key, progress);
  }

  /** Serialize read-modify-write stats updates across async callers. */
  let statsLock: Promise<unknown> = Promise.resolve();
  function serialized<T>(fn: () => Promise<T>): Promise<T> {
    const run = statsLock.then(fn, fn);
    statsLock = run.catch(() => {});
    return run;
  }

  /** Merge over defaults so stats survive schema additions. */
  async function loadStats(): Promise<Stats> {
    const saved = await store.get<Partial<Stats>>("stats");
    return { ...cfg.emptyStats, ...(saved ?? {}) };
  }

  function updateStats(fn: (stats: Stats) => Stats): Promise<Stats> {
    return serialized(async () => {
      const next = fn(await loadStats());
      await store.set("stats", next);
      return next;
    });
  }

  function recordStarted(): Promise<Stats> {
    return updateStats((s) => ({ ...s, played: s.played + 1 }));
  }

  /** One-time first-run coach marks. */
  async function loadCoachSeen(): Promise<boolean> {
    return (await store.get<boolean>("coachSeen")) === true;
  }
  async function markCoachSeen(): Promise<void> {
    await store.set("coachSeen", true);
  }

  return {
    store,
    validShape,
    loadDay,
    loadStaleDay,
    saveDay,
    loadStats,
    updateStats,
    recordStarted,
    loadCoachSeen,
    markCoachSeen,
  };
}

/**
 * The streak fields a solve of `dateKey` earns, spread into the
 * game's stats patch. The rules every game shares:
 * - only TODAY moves the streak (with the midnight grace day for a
 *   DAILY session frozen across midnight — never for archive plays);
 * - lastSolvedDate never moves backward;
 * - a day already recorded (same dateKey) doesn't re-advance.
 */
/** Does a solve of `dateKey` count as "today" for records/streaks?
 * The grace day covers a DAILY session frozen across midnight. */
export function countsAsToday(dateKey: string, allowGrace: boolean): boolean {
  const today = localDateKey();
  return (
    dateKey === today || (allowGrace && dateKey === previousDateKey(today))
  );
}

export function streakAdvance(
  stats: StreakStats,
  dateKey: string,
  allowGrace: boolean,
): Partial<StreakStats> {
  const advances =
    countsAsToday(dateKey, allowGrace) &&
    (stats.lastSolvedDate === null || dateKey > stats.lastSolvedDate);
  if (!advances) return {};
  const continues = stats.lastSolvedDate === previousDateKey(dateKey);
  const currentStreak = continues ? stats.currentStreak + 1 : 1;
  return {
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    lastSolvedDate: dateKey,
  };
}

/**
 * The streak to DISPLAY: currentStreak is only rewritten on the next
 * solve, so a lapsed streak would show its old value forever.
 */
export function displayStreak(
  stats: StreakStats,
  today = localDateKey(),
): number {
  if (!stats.lastSolvedDate) return 0;
  return stats.lastSolvedDate >= previousDateKey(today)
    ? stats.currentStreak
    : 0;
}
