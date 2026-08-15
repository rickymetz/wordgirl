import { describe, expect, it } from "vitest";
import type { ArchivedDay } from "../state/persistence";
import { rowStatus } from "./ArchivePage";

/** A one-board day: anything before HARD_EPOCH. */
const day = (over: Partial<ArchivedDay> = {}): ArchivedDay => ({
  dateKey: "2026-07-06",
  boards: 1,
  solvedCount: 1,
  startedCount: 1,
  foundWords: ["paw", "raw", "saw"],
  solved: true,
  elapsedMs: 5000,
  totalWords: 3,
  stale: false,
  retired: false,
  hintLetters: 0,
  invalids: 0,
  sessions: 1,
  solvedHour: 9,
  ...over,
});

/** A two-board day: HARD_EPOCH onwards. */
const twoBoard = (over: Partial<ArchivedDay> = {}): ArchivedDay =>
  day({ dateKey: "2026-08-20", boards: 2, solvedCount: 2, startedCount: 2, ...over });

describe("archive row status", () => {
  it("ranks a current day against its word total", () => {
    expect(rowStatus(day()).text).toBe("3/3");
  });

  it("marks a hinted day", () => {
    expect(rowStatus(day({ hintLetters: 1 })).text).toBe("3/3 · used hint");
  });

  it("says 'older words' for a retired puzzle", () => {
    // The words are real history from a puzzle that no longer exists,
    // so the row explains the mismatch instead of ranking against a
    // total the player can't reproduce.
    expect(rowStatus(day({ retired: true })).text).toBe(
      "Solved · 3 words · older words",
    );
  });

  it("says 'older words' for a legacy stale save", () => {
    expect(rowStatus(day({ stale: true, totalWords: undefined })).text).toBe(
      "Solved · 3 words · older words",
    );
  });

  it("reports an unsolved one-board day as in progress", () => {
    const { text, done } = rowStatus(day({ solved: false, solvedCount: 0 }));
    expect(text).toBe("In progress · 3 words");
    expect(done).toBe(false);
  });

  it("counts boards on a two-board day that isn't finished", () => {
    const { text, done } = rowStatus(
      twoBoard({ solved: false, solvedCount: 1 }),
    );
    expect(text).toBe("1/2 boards · 3 words");
    expect(done).toBe(false);
  });

  it("ranks a finished two-board day on its combined total", () => {
    // Both boards' words, both boards' totals — the day is the unit.
    expect(rowStatus(twoBoard({ foundWords: Array(29).fill("x"), totalWords: 29 })).text).toBe(
      "29/29",
    );
  });
});
