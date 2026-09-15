import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GAME_IDS, seedDemoHistory } from "./demoHistory";
import { createGameStore } from "./storage/createGameStore";
import { DICT_VERSION } from "./words/dictionary";
import { HARD_EPOCH } from "../games/crosshatch/state/persistence";
import { loadAllDailyProgress as loadPierglassDays } from "../games/pierglass/state/persistence";

// 2026-09-15: the 42-day span (08-04 … 09-14) straddles HARD_EPOCH
// (08-16), so the hard-board gate is actually exercised.
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const realPierglassDay = {
  dateKey: "2026-09-01",
  dictVersion: DICT_VERSION,
  puzzleKey: "a-real-fingerprint",
  rows: ["tram", "mart"],
  solved: true,
  elapsedMs: 60_000,
  statsRecorded: true,
};

describe("seedDemoHistory", () => {
  it("seeds an empty browser with records the real loaders accept", async () => {
    await expect(seedDemoHistory(false)).resolves.toBe(true);

    // The proof that the hand-mirrored shape matches: a REAL game
    // loader (validShape and all) returns the seeded days.
    const days = await loadPierglassDays();
    const keys = Object.keys(days);
    expect(keys.length).toBeGreaterThanOrEqual(30);
    expect(keys.filter((d) => days[d].solved).length).toBeGreaterThanOrEqual(
      28,
    );
    for (const d of keys) {
      expect(days[d].puzzleKey).toBe("demo-history");
      expect(days[d].stale).toBe(false);
    }
    // Today stays genuinely unplayed.
    expect(days["2026-09-15"]).toBeUndefined();

    for (const game of GAME_IDS) {
      const stats = await createGameStore(game).get<{ played: number }>(
        "stats",
      );
      expect(stats?.played, `${game} stats`).toBeGreaterThan(0);
    }
  });

  it("seeds hard crosshatch boards only on dates that have one", async () => {
    await seedDemoHistory(false);
    const store = createGameStore("crosshatch");
    const hardKeys = (await store.keys("daily:hard:")).map((k) =>
      k.slice("daily:hard:".length),
    );
    expect(hardKeys.length).toBeGreaterThan(0);
    for (const d of hardKeys) {
      expect(d >= HARD_EPOCH, `hard board seeded on ${d}`).toBe(true);
    }
    // And normal boards DO reach back before the epoch.
    const normalKeys = (await store.keys("daily:")).filter(
      (k) => !k.startsWith("daily:hard:"),
    );
    expect(normalKeys.some((k) => k.slice("daily:".length) < HARD_EPOCH)).toBe(
      true,
    );
  });

  it("never seeds a blocklisted fake word", async () => {
    await seedDemoHistory(false);
    const crude = /^(anus|arse|slut|smut|tit|tits|teat|semen|urine|moron)s?$/;
    for (const game of GAME_IDS) {
      const store = createGameStore(game);
      for (const key of await store.keys("daily:")) {
        const save = await store.get<{
          foundWords?: string[];
          rows?: string[];
        }>(key);
        for (const w of [...(save?.foundWords ?? []), ...(save?.rows ?? [])]) {
          expect(crude.test(w), `${game} ${key} seeded "${w}"`).toBe(false);
        }
      }
    }
  });

  it("refuses to touch a browser holding a real day save", async () => {
    await createGameStore("pierglass").set("daily:2026-09-01", realPierglassDay);
    await expect(seedDemoHistory(false)).resolves.toBe(false);
    expect(await createGameStore("pierglass").get("daily:2026-09-01")).toEqual(
      realPierglassDay,
    );
    expect(await createGameStore("polygram").keys("daily:")).toEqual([]);
  });

  it("treats stats-without-demo-saves as real history too", async () => {
    // Day saves pruned or synced away, lifetime stats intact — still a
    // real player's browser.
    await createGameStore("doublet").set("stats", { played: 12, solved: 12 });
    await expect(seedDemoHistory(false)).resolves.toBe(false);
  });

  it("re-seeds over its own demo data without asking", async () => {
    const confirm = vi.spyOn(window, "confirm");
    await seedDemoHistory(false);
    await expect(seedDemoHistory(false)).resolves.toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("replace over real data requires the visitor's confirmation", async () => {
    await createGameStore("pierglass").set("daily:2026-09-01", realPierglassDay);

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await expect(seedDemoHistory(true)).resolves.toBe(false);
    expect(await createGameStore("pierglass").get("daily:2026-09-01")).toEqual(
      realPierglassDay,
    );

    confirm.mockReturnValue(true);
    await expect(seedDemoHistory(true)).resolves.toBe(true);
    // The real save is gone — replace means replace, not merge.
    const days = await loadPierglassDays();
    expect(days["2026-09-01"]?.puzzleKey ?? "demo-history").toBe(
      "demo-history",
    );
  });

  it("refuses when storage cannot be read at all", async () => {
    // A storage-blocked browser throws on the localStorage access
    // itself; "couldn't check" must never become "assume it's fine".
    const boom = vi
      .spyOn(Storage.prototype, "length", "get")
      .mockImplementation(() => {
        throw new DOMException("blocked", "SecurityError");
      });
    await expect(seedDemoHistory(false)).resolves.toBe(false);
    boom.mockRestore();
  });
});
