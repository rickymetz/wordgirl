import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  displayStreak,
  isDaySolved,
  loadAllDailyProgress,
  loadDailyProgress,
  loadStaleDailyProgress,
  loadStats,
  recordDailySolved,
  recordDailyStarted,
  recordWordsProgress,
  resetDailyForReplay,
  saveDailyProgress,
  type DailyProgress,
} from "./persistence";
import { DICT_VERSION } from "../../../lib/words/dictionary";

const STATS_KEY = "wg:v1:local:crosshatch:stats";

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 6, 12, 0, 0)); // 2026-07-06 noon
});
afterEach(() => {
  vi.useRealTimers();
});

describe("stats recording", () => {
  it("a solve records stats correctly", async () => {
    await recordDailySolved("2026-07-06", "standard", 14);
    const stats = await loadStats();
    expect(stats.solved).toBe(1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.lastSolvedDate).toBe("2026-07-06");
  });

  it("solving just after midnight still counts the session's day", async () => {
    // dateKey froze at mount before midnight; the clock is now past it.
    vi.setSystemTime(new Date(2026, 6, 7, 0, 0, 30));
    const stats = await recordDailySolved("2026-07-06", "standard", 12);
    expect(stats.currentStreak).toBe(1);
    expect(stats.lastSolvedDate).toBe("2026-07-06");
    // The next evening's solve continues the streak.
    vi.setSystemTime(new Date(2026, 6, 7, 21, 0, 0));
    const next = await recordDailySolved("2026-07-07", "standard", 15);
    expect(next.currentStreak).toBe(2);
  });

  it("solving an old archive day counts totals but not the streak", async () => {
    await recordDailySolved("2026-07-06", "standard", 14);
    const stats = await recordDailySolved("2026-07-01", "standard", 10);
    expect(stats.solved).toBe(2);
    expect(stats.totalWords).toBe(24);
    expect(stats.currentStreak).toBe(1);
    expect(stats.lastSolvedDate).toBe("2026-07-06"); // never moves back
  });

  it("a day counts once however many times its boards report in", async () => {
    await recordDailySolved("2026-07-06", "standard", 14);
    const stats = await recordDailySolved("2026-07-06", "standard", 14);
    expect(stats.solved).toBe(1);
    expect(stats.currentStreak).toBe(1);
  });

  it("an archive play of yesterday never borrows the grace day", async () => {
    // It's 2026-07-07; deliberately playing 07-06 from the archive
    // (allowGrace=false) counts totals but must not move the streak.
    vi.setSystemTime(new Date(2026, 6, 7, 12, 0, 0));
    const stats = await recordDailySolved("2026-07-06", "standard", 10, false);
    expect(stats.solved).toBe(1);
    expect(stats.currentStreak).toBe(0);
    expect(stats.lastSolvedDate).toBeNull();
  });

  it("post-solve words credit the lifetime total", async () => {
    await recordDailySolved("2026-07-06", "standard", 9);
    await recordWordsProgress(2);
    const stats = await loadStats();
    expect(stats.totalWords).toBe(11);
  });

  it("displayStreak zeroes a lapsed streak but keeps a live one", () => {
    const base = {
      played: 5,
      solved: 5,
      currentStreak: 4,
      bestStreak: 4,
      lastSolvedDate: "2026-07-06",
      totalWords: 40,
    };
    expect(displayStreak(base, "2026-07-06")).toBe(4); // solved today
    expect(displayStreak(base, "2026-07-07")).toBe(4); // today still open
    expect(displayStreak(base, "2026-07-08")).toBe(0); // missed a day
    expect(
      displayStreak({ ...base, lastSolvedDate: null }, "2026-07-08"),
    ).toBe(0);
  });

  it("a stale tab's save never destroys another tab's words", async () => {
    // Tab A banked three words...
    await saveDailyProgress({
      dateKey: "2026-07-06",
      dictVersion: DICT_VERSION,
      foundWords: ["out", "tin", "van"],
      grid: {},
      revealed: {},
      solved: false,
      elapsedMs: 5000,
    });
    // ...tab B, hydrated earlier with one word, flushes its stale state.
    await saveDailyProgress({
      dateKey: "2026-07-06",
      dictVersion: DICT_VERSION,
      foundWords: ["out"],
      grid: {},
      revealed: {},
      solved: false,
      elapsedMs: 9000,
    });
    const saved = await loadDailyProgress("2026-07-06");
    expect(saved?.foundWords).toEqual(["out", "tin", "van"]);
  });

  it("a pre-v17 save is a record, not resumable progress", async () => {
    // The v17 generator change rewrote every date's puzzle, so the
    // save's puzzleKey can't match — it must not hydrate the new
    // puzzle, but it must survive as history (and as the
    // already-counted marker, so replaying doesn't re-count "played").
    await saveDailyProgress({
      dateKey: "2026-07-06",
      dictVersion: 16,
      puzzleKey: "old-key",
      foundWords: ["kagu", "habu"],
      grid: {},
      revealed: {},
      solved: true,
      elapsedMs: 5000,
    });
    expect(await loadDailyProgress("2026-07-06", "standard", "new-key")).toBeNull();
    const record = await loadStaleDailyProgress("2026-07-06", "standard", "new-key");
    expect(record?.foundWords).toEqual(["kagu", "habu"]);
    expect(record?.solved).toBe(true);
  });

  it("marks pre-v17 saves retired, but not stale", async () => {
    // v17 moved crosshatch generation to the required tier, so every
    // date's puzzle changed. The listing can't compare puzzleKeys
    // without regenerating 200+ puzzles — the version is the marker.
    // `retired` must stay distinct from `stale`: the record is still
    // accurate, so TrendsPage keeps charting its solve time.
    await saveDailyProgress({
      dateKey: "2026-07-06",
      dictVersion: 16,
      puzzleKey: "abc123",
      foundWords: ["kagu", "habu"],
      grid: {},
      revealed: {},
      solved: true,
      elapsedMs: 5000,
    });
    await saveDailyProgress({
      dateKey: "2026-07-07",
      dictVersion: DICT_VERSION,
      puzzleKey: "def456",
      foundWords: ["paw", "raw"],
      grid: {},
      revealed: {},
      solved: true,
      elapsedMs: 5000,
    });
    const days = await loadAllDailyProgress();
    expect(days["2026-07-06"].retired).toBe(true);
    expect(days["2026-07-06"].stale).toBe(false); // provenance is fine
    expect(days["2026-07-06"].foundWords).toEqual(["kagu", "habu"]); // record kept
    expect(days["2026-07-06"].elapsedMs).toBe(5000); // still chartable
    expect(days["2026-07-07"].retired).toBe(false);
    expect(days["2026-07-07"].stale).toBe(false);
  });

  it("still flags a legacy save with no puzzleKey as stale", async () => {
    localStorage.setItem(
      "wg:v1:local:crosshatch:daily:2026-07-06",
      JSON.stringify({
        dateKey: "2026-07-06",
        dictVersion: 12,
        foundWords: ["out"],
        grid: {},
        revealed: {},
        solved: true,
        elapsedMs: 5000,
      }),
    );
    const days = await loadAllDailyProgress();
    expect(days["2026-07-06"].stale).toBe(true);
    expect(days["2026-07-06"].retired).toBe(true);
  });

  it("loadStats merges older blobs over defaults", async () => {
    localStorage.setItem(
      STATS_KEY,
      JSON.stringify({ played: 3, solved: 2, currentStreak: 2 }),
    );
    const stats = await loadStats();
    expect(stats.played).toBe(3);
    expect(stats.totalWords).toBe(0); // missing field gets its default
  });
});

describe("two boards a day", () => {
  const HARD_DAY = "2026-08-20"; // on or after HARD_EPOCH
  const save = (over: Partial<DailyProgress> & { dateKey: string }) =>
    saveDailyProgress({
      dictVersion: DICT_VERSION,
      foundWords: [],
      grid: {},
      revealed: {},
      solved: false,
      elapsedMs: 0,
      ...over,
    });

  it("keeps the two boards' saves apart", async () => {
    await save({ dateKey: HARD_DAY, level: "standard", foundWords: ["out"] });
    await save({ dateKey: HARD_DAY, level: "hard", foundWords: ["ounce"] });
    expect((await loadDailyProgress(HARD_DAY, "standard"))?.foundWords).toEqual(["out"]);
    expect((await loadDailyProgress(HARD_DAY, "hard"))?.foundWords).toEqual(["ounce"]);
  });

  it("stores the standard board under the bare dateKey it always used", async () => {
    // Prefixing it would orphan every save already on a player's device.
    await save({ dateKey: HARD_DAY, level: "standard", foundWords: ["out"] });
    expect(
      localStorage.getItem(`wg:v1:local:crosshatch:daily:${HARD_DAY}`),
    ).not.toBeNull();
  });

  it("reads a pre-hard-board save, which carries no level, as standard", async () => {
    localStorage.setItem(
      "wg:v1:local:crosshatch:daily:2026-07-06",
      JSON.stringify({
        dateKey: "2026-07-06",
        dictVersion: DICT_VERSION,
        foundWords: ["out"],
        grid: {},
        revealed: {},
        solved: true,
        elapsedMs: 5000,
      }),
    );
    expect((await loadDailyProgress("2026-07-06", "standard"))?.solved).toBe(true);
  });

  it("needs both boards before the day is solved", async () => {
    await save({ dateKey: HARD_DAY, level: "standard", solved: true });
    expect(await isDaySolved(HARD_DAY)).toBe(false);
    await save({ dateKey: HARD_DAY, level: "hard", solved: true });
    expect(await isDaySolved(HARD_DAY)).toBe(true);
  });

  it("leaves days before the hard board one-board days, for good", async () => {
    // The guarantee that protects history: a day finished before the
    // hard board existed must not become unsolved — or break a streak —
    // because a second board was invented afterwards.
    await save({ dateKey: "2026-07-06", solved: true });
    expect(await isDaySolved("2026-07-06")).toBe(true);
    const days = await loadAllDailyProgress();
    expect(days["2026-07-06"].boards).toBe(1);
    expect(days["2026-07-06"].solved).toBe(true);
  });

  it("moves the streak only when the day's second board lands", async () => {
    vi.setSystemTime(new Date(2026, 7, 20, 12, 0, 0)); // 2026-08-20
    await save({ dateKey: HARD_DAY, level: "standard", solved: true });
    let stats = await recordDailySolved(HARD_DAY, "standard", 12);
    expect(stats.solved).toBe(0); // one board is not a day
    expect(stats.currentStreak).toBe(0);
    expect(stats.totalWords).toBe(12); // but the words are the player's

    await save({ dateKey: HARD_DAY, level: "hard", solved: true });
    stats = await recordDailySolved(HARD_DAY, "hard", 15);
    expect(stats.solved).toBe(1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.totalWords).toBe(27);
  });

  it("counts a two-board date as one play, not two", async () => {
    vi.setSystemTime(new Date(2026, 7, 20, 12, 0, 0));
    await recordDailyStarted(HARD_DAY, "standard");
    await save({ dateKey: HARD_DAY, level: "standard", foundWords: ["out"] });
    // Opening the hard board later is the same day's play.
    await recordDailyStarted(HARD_DAY, "hard");
    expect((await loadStats()).played).toBe(1);
  });

  it("rolls both boards up into one archive day", async () => {
    await save({
      dateKey: HARD_DAY,
      level: "standard",
      foundWords: ["out", "tin"],
      revealed: { out: [0] },
      totalWords: 12,
      elapsedMs: 5000,
      invalids: 1,
      sessions: 1,
      solved: true,
    });
    await save({
      dateKey: HARD_DAY,
      level: "hard",
      foundWords: ["ounce"],
      revealed: {},
      totalWords: 15,
      elapsedMs: 7000,
      invalids: 2,
      sessions: 1,
      solved: false,
    });
    const day = (await loadAllDailyProgress())[HARD_DAY];
    expect(day.boards).toBe(2);
    expect(day.solvedCount).toBe(1);
    expect(day.solved).toBe(false); // the hard board is still standing
    expect(day.foundWords).toHaveLength(3);
    expect(day.totalWords).toBe(27);
    expect(day.elapsedMs).toBe(12000);
    expect(day.hintLetters).toBe(1);
    expect(day.invalids).toBe(3);
  });

  it("charts a gap when only one board carries a counter", async () => {
    // A partial sum presented as the day's total is as fake as a zero.
    await save({
      dateKey: HARD_DAY,
      level: "standard",
      solved: true,
      invalids: 2,
      sessions: 1,
    });
    await save({ dateKey: HARD_DAY, level: "hard", solved: true }); // no counters
    const day = (await loadAllDailyProgress())[HARD_DAY];
    expect(day.invalids).toBeNull();
    expect(day.sessions).toBeNull();
    expect(day.solved).toBe(true);
  });

  it("replaying one board leaves the other alone", async () => {
    await save({ dateKey: HARD_DAY, level: "standard", foundWords: ["out"], solved: true });
    await save({ dateKey: HARD_DAY, level: "hard", foundWords: ["ounce"], solved: true });
    await resetDailyForReplay(HARD_DAY, "hard");
    expect((await loadDailyProgress(HARD_DAY, "standard"))?.foundWords).toEqual(["out"]);
    expect((await loadDailyProgress(HARD_DAY, "hard"))?.foundWords).toEqual([]);
  });
});

describe("save validation", () => {
  it("rejects a save with a malformed revealed field", async () => {
    localStorage.setItem(
      "wg:v1:local:crosshatch:daily:2026-07-06",
      JSON.stringify({
        dateKey: "2026-07-06",
        dictVersion: DICT_VERSION,
        foundWords: ["out"],
        grid: {},
        revealed: "corrupted",
        solved: false,
        elapsedMs: 1000,
      }),
    );
    expect(await loadDailyProgress("2026-07-06")).toBeNull();
  });

  it("accepts a save without revealed (pre-hints era)", async () => {
    localStorage.setItem(
      "wg:v1:local:crosshatch:daily:2026-07-06",
      JSON.stringify({
        dateKey: "2026-07-06",
        dictVersion: DICT_VERSION,
        foundWords: ["out"],
        grid: {},
        solved: false,
        elapsedMs: 1000,
      }),
    );
    expect(await loadDailyProgress("2026-07-06")).not.toBeNull();
  });
});
