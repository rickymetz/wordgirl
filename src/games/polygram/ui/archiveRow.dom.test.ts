import { describe, expect, it } from "vitest";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import type { ArchivedDay } from "../state/persistence";
import { rowStatus } from "./ArchivePage";

const day = (over: Partial<ArchivedDay> = {}): ArchivedDay => ({
  dateKey: "2026-07-06",
  dictVersion: DICT_VERSION,
  foundWords: ["bad", "dab", "abba"],
  revealed: {},
  completed: true,
  solved: true,
  elapsedMs: 5000,
  totalWords: 4,
  stale: false,
  ...over,
});

describe("archive row status", () => {
  it("reports the sweep against the day's word total", () => {
    expect(rowStatus(day()).text).toBe("3/4");
  });

  it("marks a hinted day", () => {
    expect(rowStatus(day({ revealed: { bad: [0] } })).text).toBe(
      "3/4 · used hint",
    );
  });

  it("says 'older words' for a stale save", () => {
    expect(rowStatus(day({ stale: true })).text).toBe(
      "Solved · 3 words · older words",
    );
  });

  it("counts alone on a day banked before the total was stored", () => {
    expect(rowStatus(day({ totalWords: undefined })).text).toBe(
      "Solved · 3 words",
    );
  });

  it("reports an unfinished day as in progress", () => {
    const { text, done } = rowStatus(day({ completed: false, solved: false }));
    expect(text).toBe("In progress · 3 words");
    expect(done).toBe(false);
  });
});
