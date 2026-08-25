import { describe, expect, it } from "vitest";
import { dateKeyFormats, formatDateKey, localDateKey } from "./date";

describe("localDateKey", () => {
  it("formats as YYYY-MM-DD with zero padding", () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(localDateKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("dateKeyFormats", () => {
  it("is a longest-first ladder starting at formatDateKey", () => {
    const rungs = dateKeyFormats("2026-08-25");
    expect(rungs[0]).toBe(formatDateKey("2026-08-25"));
    expect(rungs).toEqual([
      "Tuesday, August 25",
      "Tuesday, Aug 25",
      "Tue, Aug 25",
      "Aug 25",
    ]);
  });

  it("gets shorter (or no longer) at every rung, so the ladder can only help", () => {
    const rungs = dateKeyFormats("2026-08-25");
    for (let i = 1; i < rungs.length; i++) {
      expect(rungs[i].length).toBeLessThan(rungs[i - 1].length);
    }
  });

  it("drops the weekday only at the last rung", () => {
    const rungs = dateKeyFormats("2026-08-25");
    expect(rungs.slice(0, 3).every((r) => /Tue/.test(r))).toBe(true);
    expect(rungs[3]).not.toMatch(/Tue/);
  });
});
