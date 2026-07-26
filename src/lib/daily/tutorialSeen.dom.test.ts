import { beforeEach, describe, expect, it } from "vitest";
import {
  loadAllDailyProgress,
  loadCoachSeen,
  loadStats,
  loadTutorialSeen,
  markCoachSeen,
  markTutorialSeen,
  store,
} from "../../games/polygram/state/persistence";

beforeEach(() => {
  localStorage.clear();
});

describe("the tutorial-seen flag", () => {
  it("is false until marked, then sticks", async () => {
    expect(await loadTutorialSeen()).toBe(false);
    await markTutorialSeen();
    expect(await loadTutorialSeen()).toBe(true);
  });

  it("is independent of coachSeen", async () => {
    // The coach sheet no longer auto-opens, so its flag can't double as
    // "has been introduced" — a player who saw the old sheet must still
    // be offered the tutorial, and skipping the tutorial must not silence
    // the "?" button's sheet.
    await markCoachSeen();
    expect(await loadTutorialSeen()).toBe(false);

    localStorage.clear();
    await markTutorialSeen();
    expect(await loadCoachSeen()).toBe(false);
  });

  it("does NOT live under the daily: prefix", async () => {
    // loadAllDailyProgress walks store.keys("daily:") — anything written
    // there shows up in the archive calendar and the trends charts.
    await markTutorialSeen();
    const dailyKeys = await store.keys("daily:");
    expect(dailyKeys).toEqual([]);
    expect(await loadAllDailyProgress()).toEqual({});
  });

  it("never touches stats or the streak", async () => {
    const before = await loadStats();
    await markTutorialSeen();
    expect(await loadStats()).toEqual(before);
    expect(before.played).toBe(0);
    expect(before.currentStreak).toBe(0);
  });
});
