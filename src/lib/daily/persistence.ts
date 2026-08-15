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
  /** Deterministic fingerprint of the puzzle for this date — when
   * present on BOTH a saved and current puzzle, used instead of
   * dictVersion to detect staleness (so an unrelated game's version
   * bump doesn't wipe progress). */
  puzzleKey?: string;
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

  /** Is the saved puzzle still the same one we'd generate today?
   * When both sides carry a puzzleKey, compare those (immune to
   * unrelated DICT_VERSION bumps); fall back to dictVersion for
   * legacy saves without a key. */
  function puzzleMatches(
    saved: Day,
    currentPuzzleKey: string | undefined,
  ): boolean {
    if (currentPuzzleKey && saved.puzzleKey) {
      return saved.puzzleKey === currentPuzzleKey;
    }
    return saved.dictVersion === DICT_VERSION;
  }

  /** The current-dictionary save, or null (stale saves stay hidden). */
  async function loadDay(
    subKey: string,
    currentPuzzleKey?: string,
  ): Promise<Day | null> {
    const saved = await readDay(subKey);
    if (saved && !puzzleMatches(saved, currentPuzzleKey)) return null;
    return saved;
  }

  /**
   * The save for a board whatever version wrote it — the RECORD, not
   * resumable progress.
   *
   * "Did you finish that board on that date" is a question about
   * history, and history does not un-happen when a dictionary bumps.
   * `loadDay` is the wrong tool for it: with no puzzleKey to compare it
   * falls back to `dictVersion === DICT_VERSION`, so after any game's
   * bump a perfectly good sibling save reads as ABSENT — which would
   * stop a day ever completing (losing the streak) and let `played`
   * count the same date twice.
   */
  async function loadDayRecord(subKey: string): Promise<Day | null> {
    return readDay(subKey);
  }

  /** A save from an OLDER dictionary, kept as a historical record. */
  async function loadStaleDay(
    subKey: string,
    currentPuzzleKey?: string,
  ): Promise<Day | null> {
    const saved = await readDay(subKey);
    if (saved && !puzzleMatches(saved, currentPuzzleKey)) return saved;
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
    if (stored && stored.solved && !progress.solved) return;
    if (stored && stored.dictVersion === progress.dictVersion) {
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

  /**
   * Every saved day, grouped by date — the first step of every archive
   * roll-up. Games with one board a day get single-entry groups; the
   * multi-board games (crosshatch's two, doublet's three, serpentine's
   * two) get one entry per board, which is exactly what their listings
   * need to merge.
   *
   * A save with no dateKey is skipped rather than filed under
   * `undefined`: only serpentine's copy of this loop guarded for it, and
   * a corrupt save should not invent a row in the calendar.
   */
  async function loadDaysByDate(): Promise<Record<string, Day[]>> {
    const byDate: Record<string, Day[]> = {};
    for (const key of await store.keys("daily:")) {
      const saved = validShape(await store.get<Day>(key));
      if (saved?.dateKey) (byDate[saved.dateKey] ??= []).push(saved);
    }
    return byDate;
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

  /**
   * The first-visit tutorial offer, marked once the player has either
   * taken it or waved it off. Deliberately OUTSIDE the "daily:" prefix
   * so it never surfaces in loadAllDailyProgress (the archive calendar
   * and the trends charts both walk that prefix), and deliberately
   * separate from coachSeen: the coach sheet is now opened on demand
   * only, so its flag no longer tracks "has been introduced".
   */
  async function loadTutorialSeen(): Promise<boolean> {
    return (await store.get<boolean>("tutorialSeen")) === true;
  }
  async function markTutorialSeen(): Promise<void> {
    await store.set("tutorialSeen", true);
  }

  return {
    store,
    validShape,
    loadDay,
    loadStaleDay,
    loadDayRecord,
    loadDaysByDate,
    saveDay,
    loadStats,
    updateStats,
    recordStarted,
    loadCoachSeen,
    markCoachSeen,
    loadTutorialSeen,
    markTutorialSeen,
  };
}

/**
 * Is every board of the date OTHER than this one already solved?
 *
 * The multi-board games all need this at the same moment — the instant
 * a board is solved, to decide whether the DAY is done and the streak
 * moves. It asks about the others and takes the calling board as solved
 * by construction, because that board's own save may not have reached
 * storage yet: it is written by a different effect, and racing it would
 * lose a streak at random.
 */
export async function everyOtherBoardSolved<B extends string>(
  boards: readonly B[],
  current: B,
  load: (board: B) => Promise<{ solved: boolean } | null>,
): Promise<boolean> {
  const others = await loadOtherBoards(boards, current, load);
  return others.every((save) => save?.solved === true);
}

/**
 * Is this the FIRST board of its date to be opened — i.e. does opening
 * it start a new day?
 *
 * `played` counts days, so the second board of a date opened later must
 * not count again. The caller has already established that THIS board
 * has no save; this asks about the date's others.
 */
export async function isFirstBoardOfDay<B extends string>(
  boards: readonly B[],
  current: B,
  load: (board: B) => Promise<unknown | null>,
): Promise<boolean> {
  const others = await loadOtherBoards(boards, current, load);
  return others.every((save) => save === null);
}

function loadOtherBoards<B extends string, D>(
  boards: readonly B[],
  current: B,
  load: (board: B) => Promise<D | null>,
): Promise<(D | null)[]> {
  return Promise.all(boards.filter((b) => b !== current).map(load));
}

/**
 * A counter summed across a date's boards, or null when ANY of them
 * predates the counter. The rule the multi-board games share: a partial
 * sum presented as the day's total is as fake as a zero, so a day
 * mixing tracked and untracked saves charts as a GAP.
 */
export function sumAcrossBoards<Day>(
  saves: readonly Day[],
  read: (save: Day) => number | undefined,
): number | null {
  let total = 0;
  for (const save of saves) {
    const value = read(save);
    if (value === undefined) return null;
    total += value;
  }
  return total;
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
