import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { TUTORIAL_PUZZLE } from "../engine/tutorial";
import { initialEntries } from "./reducer";
import {
  anagridPuzzleKey,
  loadAllDailyProgress,
  loadDailyProgress,
  loadStaleDailyProgress,
  loadStats,
  recordDailySolved,
  resetDailyForReplay,
  saveDailyProgress,
  type DailyProgress,
} from "./persistence";

const ENTRIES = initialEntries(TUTORIAL_PUZZLE);
const KEY = anagridPuzzleKey(TUTORIAL_PUZZLE);

const day = (over: Partial<DailyProgress> = {}): DailyProgress => ({
  dateKey: "2026-09-23",
  dictVersion: DICT_VERSION,
  puzzleKey: KEY,
  entries: ENTRIES,
  revealed: [],
  solved: false,
  elapsedMs: 0,
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 23, 12, 0, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("day saves", () => {
  it("round-trips a day", async () => {
    await saveDailyProgress(day({ elapsedMs: 5_000 }), { edited: true });
    expect((await loadDailyProgress("2026-09-23", KEY))?.elapsedMs).toBe(5_000);
  });

  it("a different puzzle's save is stale, not resumable", async () => {
    await saveDailyProgress(day(), { edited: true });
    expect(await loadDailyProgress("2026-09-23", "other")).toBeNull();
    expect(await loadStaleDailyProgress("2026-09-23", "other")).not.toBeNull();
  });

  it("rejects a malformed save", async () => {
    await saveDailyProgress(day({ entries: "short" }), { edited: true });
    expect(await loadDailyProgress("2026-09-23", KEY)).toBeNull();
  });

  it("a tab that never edited can't overwrite different entries", async () => {
    const edited = "s" + ENTRIES.slice(1);
    await saveDailyProgress(day({ entries: edited }), { edited: true });
    await saveDailyProgress(day(), { edited: false });
    expect((await loadDailyProgress("2026-09-23", KEY))?.entries).toBe(edited);
  });

  it("the archive lists a solved day's two words", async () => {
    await saveDailyProgress(
      day({ solved: true, cluedWord: "listen", hiddenWord: "silent" }),
      { edited: true },
    );
    const all = await loadAllDailyProgress();
    expect(all["2026-09-23"].foundWords).toEqual(["listen", "silent"]);
  });

  it("replay reset keeps the day counted", async () => {
    await saveDailyProgress(day({ solved: true }), { edited: true });
    await resetDailyForReplay("2026-09-23", ENTRIES, KEY);
    const saved = await loadDailyProgress("2026-09-23", KEY);
    expect(saved?.solved).toBe(false);
    expect(saved?.statsRecorded).toBe(true);
  });
});

describe("stats", () => {
  it("counts a solve once and advances the streak", async () => {
    await recordDailySolved("2026-09-23", 60_000, 0);
    const stats = await recordDailySolved("2026-09-23", 60_000, 0);
    expect(stats.solved).toBe(1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.hintFreeSolves).toBe(1);
    expect(stats.bestTimeMs).toBe(60_000);
  });

  it("hinted solves don't count as hint-free", async () => {
    const stats = await recordDailySolved("2026-09-23", 60_000, 2);
    expect(stats.hintFreeSolves).toBe(0);
  });

  it("an archive play never claims the best time or the streak", async () => {
    const stats = await recordDailySolved("2026-09-20", 5_000, 0, false);
    expect(stats.solved).toBe(1);
    expect(stats.bestTimeMs).toBeNull();
    expect(stats.currentStreak).toBe(0);
    expect((await loadStats()).solved).toBe(1);
  });
});
