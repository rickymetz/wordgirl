import { describe, expect, it } from "vitest";
import { firstFitting } from "./textFit";

// A stand-in for canvas metrics: every glyph is 10px wide.
const perChar = (text: string) => text.length * 10;

describe("firstFitting", () => {
  const rungs = ["Tuesday, August 25", "Tuesday, Aug 25", "Tue, Aug 25", "Aug 25"];

  it("keeps the longest candidate when it fits", () => {
    expect(firstFitting(rungs, 500, perChar)).toBe("Tuesday, August 25");
  });

  it("steps down to the first rung that fits, not the shortest", () => {
    // 160px fits "Tue, Aug 25" (110) and "Tuesday, Aug 25" (150) but not
    // the 180px long form — the longest that fits wins.
    expect(firstFitting(rungs, 160, perChar)).toBe("Tuesday, Aug 25");
    expect(firstFitting(rungs, 120, perChar)).toBe("Tue, Aug 25");
  });

  it("falls back to the shortest when nothing fits — something must render", () => {
    expect(firstFitting(rungs, 10, perChar)).toBe("Aug 25");
  });

  it("treats an exact fit as fitting", () => {
    expect(firstFitting(rungs, 180, perChar)).toBe("Tuesday, August 25");
  });

  it("keeps the longest for an unmeasured box, rather than flashing the shortest", () => {
    // 0 is "not laid out yet", not "no room at all".
    expect(firstFitting(rungs, 0, perChar)).toBe("Tuesday, August 25");
    expect(firstFitting(rungs, Number.NaN, perChar)).toBe("Tuesday, August 25");
  });

  it("has nothing to pick from an empty ladder", () => {
    expect(firstFitting([], 100, perChar)).toBe("");
  });
});
