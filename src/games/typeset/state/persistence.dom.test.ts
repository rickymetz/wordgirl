import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { dailyBoard, type BoardKind } from "../engine/schedule";
import {
  isDaySolved,
  loadAllDailyProgress,
  loadDailyProgress,
  loadStaleDailyProgress,
  loadStats,
  recordDailySolved,
  recordDailyStarted,
  resetDailyForReplay,
  saveDailyProgress,
  typesetPuzzleKey,
  type DailyProgress,
} from "./persistence";

const DATE = "2026-10-12";

const day = (board: BoardKind, over: Partial<DailyProgress> = {}): DailyProgress => ({
  dateKey: DATE,
  board,
  dictVersion: DICT_VERSION,
  puzzleKey: typesetPuzzleKey(dailyBoard(over.dateKey ?? DATE, board)),
  found: [],
  total: 5,
  misses: 0,
  hints: 0,
  solved: false,
  elapsedMs: 0,
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 12, 12, 0, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("two boards a day", () => {
  it("keeps each board's save separate", async () => {
    await saveDailyProgress(day("charset", { found: ["0,1,2"] }));
    await saveDailyProgress(day("faces", { found: ["3,4,5", "6,7,8"] }));
    const c = await loadDailyProgress(DATE, "charset", typesetPuzzleKey(dailyBoard(DATE, "charset")));
    const f = await loadDailyProgress(DATE, "faces", typesetPuzzleKey(dailyBoard(DATE, "faces")));
    expect(c?.found).toEqual(["0,1,2"]);
    expect(f?.found).toHaveLength(2);
  });

  it("counts a date as one play, whichever board opens first", async () => {
    expect(await recordDailyStarted(DATE, "faces")).toBe(true);
    await saveDailyProgress(day("faces"));
    expect(await recordDailyStarted(DATE, "charset")).toBe(false);
    expect((await loadStats()).played).toBe(1);
  });

  it("counts the DAY solved and advances the streak only once both boards are", async () => {
    await saveDailyProgress(day("charset", { solved: true }));
    let stats = await recordDailySolved(DATE, "charset");
    expect(stats.solved).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(await isDaySolved(DATE)).toBe(false);

    await saveDailyProgress(day("faces", { solved: true }));
    stats = await recordDailySolved(DATE, "faces");
    expect(stats.solved).toBe(1);
    expect(stats.currentStreak).toBe(1);
    expect(await isDaySolved(DATE)).toBe(true);
  });

  it("never lets an unsolved save overwrite a solved one", async () => {
    await saveDailyProgress(day("charset", { solved: true, found: ["a"] }));
    await saveDailyProgress(day("charset", { solved: false, found: [] }));
    const saved = await loadDailyProgress(DATE, "charset", typesetPuzzleKey(dailyBoard(DATE, "charset")));
    expect(saved?.solved).toBe(true);
  });

  it("treats a save for a different deal as stale, not resumable", async () => {
    await saveDailyProgress(day("charset", { puzzleKey: "old-deal", found: ["0,1,2"] }));
    const pKey = typesetPuzzleKey(dailyBoard(DATE, "charset"));
    expect(await loadDailyProgress(DATE, "charset", pKey)).toBeNull();
    expect(await loadStaleDailyProgress(DATE, "charset", pKey)).not.toBeNull();
  });

  it("resets one board for an archive replay without counting it again", async () => {
    await saveDailyProgress(day("faces", { solved: true, found: ["x"] }));
    await resetDailyForReplay(DATE, "faces", 5);
    const saved = await loadDailyProgress(DATE, "faces");
    expect(saved?.found).toEqual([]);
    expect(saved?.statsRecorded).toBe(true);
  });
});

describe("archive roll-up", () => {
  it("merges a date's boards, and reads a missing counter as a gap", async () => {
    await saveDailyProgress(day("charset", { solved: true, found: ["a", "b"], total: 2, misses: 1, hints: 0, elapsedMs: 1000 }));
    await saveDailyProgress(day("faces", { found: ["c"], total: 4, misses: 2, hints: 1, elapsedMs: 500 }));
    const all = await loadAllDailyProgress();
    const d = all[DATE];
    expect(d.solvedCount).toBe(1);
    expect(d.solved).toBe(false);
    expect(d.setsFound).toBe(3);
    expect(d.setsTotal).toBe(6);
    expect(d.misses).toBe(3);
    expect(d.hints).toBe(1);
    expect(d.elapsedMs).toBe(1500);
    expect(d.sessions).toBeNull();
    expect(d.foundWords).toEqual(["charset:a", "charset:b", "faces:c"]);
  });
});
