import { describe, expect, it } from "vitest";
import type { ArchivedDay } from "../state/persistence";
import { rowStatus } from "./ArchivePage";

const day = (over: Partial<ArchivedDay>): ArchivedDay =>
  ({ solvedCount: 2, startedCount: 2, solved: true, stale: false, elapsedMs: 0, setsFound: 9, setsTotal: 9, misses: 0, hints: 0, sessions: 1, solvedHour: 9, foundWords: [], ...over }) as ArchivedDay;

describe("archive row status", () => {
  it("leads with Solved / In progress, as the siblings do", () => {
    expect(rowStatus(day({})).text).toBe("Solved · 9 sets");
    expect(rowStatus(day({ solved: false, solvedCount: 1, setsFound: 5 })).text).toBe("In progress · 1/2 boards · 5 sets");
  });

  it("counts misses and hints only when there are some, and says set for one", () => {
    expect(rowStatus(day({ misses: 1, hints: 2 })).text).toBe("Solved · 9 sets · 1 miss · 2 hints");
    expect(rowStatus(day({ solved: false, solvedCount: 0, setsFound: 1 })).text).toBe("In progress · 0/2 boards · 1 set");
  });

  it("marks a day saved against an older deal", () => {
    expect(rowStatus(day({ stale: true })).text).toBe("Solved · 9 sets · older boards");
  });
});
