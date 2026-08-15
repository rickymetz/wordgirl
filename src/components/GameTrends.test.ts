import { describe, expect, it } from "vitest";
import { config as crosshatch } from "../games/crosshatch/ui/TrendsPage";
import { config as polygram } from "../games/polygram/ui/TrendsPage";
import { config as serpentine } from "../games/serpentine/ui/TrendsPage";
import type { ArchivedDay as CrosshatchDay } from "../games/crosshatch/state/persistence";
import type { ArchivedDay as PolygramDay } from "../games/polygram/state/persistence";
import type { ArchivedDay as SerpentineDay } from "../games/serpentine/state/persistence";
import type { TrendMetric } from "./GameTrends";

/** The metric a page charts under `key`. */
function metric<T>(
  cfg: { metrics: TrendMetric<T>[] },
  key: string,
): TrendMetric<T> {
  const m = cfg.metrics.find((x) => x.key === key);
  if (!m) throw new Error(`no metric ${key}`);
  return m;
}

/**
 * A day fixture carrying only the fields the metric under test reads —
 * the rest of an ArchivedDay is irrelevant to it, and spelling every
 * field out would bury the one the test is about.
 */
const day = <T,>(fields: Partial<T>): T =>
  ({ dateKey: "2026-07-20", ...fields }) as T;

describe("a metric whose field is missing charts a gap, not a zero", () => {
  // The bug this pins: crosshatch's validDay ADMITS a save with no
  // `revealed`, and folding that to 0 drew a hint-free day the player
  // never had — best-ever on a lower-is-better line, and an average
  // pulled toward zero by days holding no hint data at all.
  it("crosshatch: a solved day with no hint data is null", () => {
    // The roll-up hands the page `null` when any of the day's boards
    // saved before the counter shipped.
    const hints = metric(crosshatch, "hints");
    expect(hints.lowerIsBetter).toBe(true);
    expect(
      hints.value(day<CrosshatchDay>({ solved: true, hintLetters: null })),
    ).toBeNull();
  });

  it("crosshatch: a genuine hint-free day is still 0, not a gap", () => {
    // The distinction the fix has to preserve: 0 is a day that recorded
    // hints and used none. Only ABSENT data is unknown.
    const hints = metric(crosshatch, "hints");
    expect(hints.value(day<CrosshatchDay>({ solved: true, hintLetters: 0 }))).toBe(0);
    expect(hints.value(day<CrosshatchDay>({ solved: true, hintLetters: 2 }))).toBe(2);
  });

  it("polygram: the same, and it still counts legacy number counts", () => {
    const hints = metric(polygram, "hints");
    expect(hints.value(day<PolygramDay>({ solved: true, completed: true }))).toBeNull();
    expect(
      hints.value(day<PolygramDay>({ solved: true, completed: true, revealed: {} })),
    ).toBe(0);
    // Older polygram saves stored a COUNT per word rather than positions.
    expect(
      hints.value(day<PolygramDay>({ solved: true, completed: true, revealed: { cat: 2 } })),
    ).toBe(2);
  });

  it("neither charts an unsolved day", () => {
    expect(
      metric(crosshatch, "hints").value(day<CrosshatchDay>({ solved: false, hintLetters: 0 })),
    ).toBeNull();
    expect(
      metric(polygram, "hints").value(
        day<PolygramDay>({ solved: false, completed: false, revealed: {} }),
      ),
    ).toBeNull();
  });
});

describe("serpentine reports the day it actually solved", () => {
  // A date holds a Haiku and a Poem. The roll-up sums time across the
  // solved ones and takes cellCount from the furthest trace on EITHER —
  // so a part-traced Poem used to report a puzzle length never completed,
  // and two solves used to read as one very slow day.
  const both = day<SerpentineDay>({
    solved: true,
    stale: false,
    solvedCount: 2,
    elapsedMs: 600_000,
    cellCount: 90,
    solvedCellCount: 90,
  });
  const haikuOnly = day<SerpentineDay>({
    solved: true,
    stale: false,
    solvedCount: 1,
    elapsedMs: 300_000,
    // Traced 70 cells of the Poem before giving up; solved the 46 Haiku.
    cellCount: 70,
    solvedCellCount: 46,
  });

  it("charts time per puzzle, so one solve and two are comparable", () => {
    const time = metric(serpentine, "time");
    expect(time.value(both)).toBe(300_000);
    expect(time.value(haikuOnly)).toBe(300_000);
  });

  it("charts the length of a board that was finished", () => {
    const cells = metric(serpentine, "cells");
    expect(cells.value(haikuOnly)).toBe(46);
    expect(cells.value(both)).toBe(90);
  });

  it("charts nothing on a day that was opened but never solved", () => {
    const opened = day<SerpentineDay>({
      solved: false,
      stale: false,
      solvedCount: 0,
      elapsedMs: 0,
      cellCount: 12,
      solvedCellCount: null,
    });
    expect(metric(serpentine, "time").value(opened)).toBeNull();
    expect(metric(serpentine, "cells").value(opened)).toBeNull();
  });
});

describe("polygram's new metrics", () => {
  const solved = (fields: Partial<PolygramDay>) =>
    day<PolygramDay>({ solved: true, completed: true, ...fields });

  it("charts no share-of-board metric at all", () => {
    // Deliberately absent. A share needs a denominator, and the only
    // candidate was every word on the board — a tier that averages 142
    // words against 17 required and swings from 3 to 615, so a fully
    // solved day charted in the single digits. Bonus words are texture,
    // and texture has no percentage.
    expect(polygram.metrics.find((m) => m.key === "share")).toBeUndefined();
  });

  it("counts levels skipped, and knows nothing from a save without them", () => {
    const skipped = metric(polygram, "skipped");
    expect(skipped.lowerIsBetter).toBe(true);
    expect(skipped.value(solved({ skippedLevels: [3, 5] }))).toBe(2);
    // A day that skipped none says so...
    expect(skipped.value(solved({ skippedLevels: [] }))).toBe(0);
    // ...and one from before the field existed says nothing at all.
    expect(skipped.value(solved({}))).toBeNull();
  });

  it("counts words found on any day that found some", () => {
    const words = metric(polygram, "words");
    expect(words.value(solved({ foundWords: ["cat", "cart"] }))).toBe(2);
    expect(words.value(solved({ foundWords: [] }))).toBeNull();
  });

  it("counts sessions, gapping the days that predate the counter", () => {
    const sessions = metric(polygram, "sessions");
    expect(sessions.value(solved({ sessions: 3 }))).toBe(3);
    expect(sessions.value(solved({}))).toBeNull();
  });
});

describe("every game charts an hour histogram", () => {
  it("including polygram, which had none", () => {
    // The checklist asks each game for it; polygram was the one without a
    // solvedHour field to build it from.
    for (const cfg of [crosshatch, polygram, serpentine]) {
      expect(cfg.hours).toBeDefined();
    }
    expect(
      polygram.hours!.value(day<PolygramDay>({ completed: true, solvedHour: 9 })),
    ).toBe(9);
    // Banked before the field shipped: absent, so it joins no bin.
    expect(polygram.hours!.value(day<PolygramDay>({ completed: true }))).toBeNull();
    expect(
      polygram.hours!.value(day<PolygramDay>({ completed: false, solvedHour: 9 })),
    ).toBeNull();
  });
});
