import { describe, expect, it } from "vitest";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import type { ArchivedDay } from "../state/persistence";
import { rowStatus } from "./ArchivePage";

const day = (over: Partial<ArchivedDay> = {}): ArchivedDay => ({
  dateKey: "2026-07-06",
  dictVersion: DICT_VERSION,
  foundWords: ["paw", "raw", "saw"],
  grid: {},
  revealed: {},
  solved: true,
  elapsedMs: 5000,
  totalWords: 3,
  stale: false,
  retired: false,
  ...over,
});

describe("archive row status", () => {
  it("ranks a current day against its word total", () => {
    expect(rowStatus(day()).text).toBe("3/3");
  });

  it("marks a hinted day", () => {
    expect(rowStatus(day({ revealed: { paw: [0] } })).text).toBe(
      "3/3 · used hint",
    );
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

  it("reports an unsolved day as in progress", () => {
    const { text, done } = rowStatus(day({ solved: false }));
    expect(text).toBe("In progress · 3 words");
    expect(done).toBe(false);
  });
});
