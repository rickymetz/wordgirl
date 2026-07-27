import { describe, expect, it } from "vitest";
import { nextHintIndex, replayHints } from "./hints";

// "A WORLD OF GRIEF AND PAIN FLOWERS BLOOM EVEN THEN" — the 2026-07-24
// daily. Ten words, forty letters.
const LEN = 40;

describe("nextHintIndex", () => {
  it("reveals the cell the player is stuck on", () => {
    // Nine of ten words placed: the hint places the "T" of THEN, whose
    // letter the readout already gives. What it adds is WHERE.
    expect(nextHintIndex(LEN, 36, new Set())).toBe(36);
  });

  it("never targets a cell the snake already covers", () => {
    expect(nextHintIndex(LEN, 36, new Set())).toBeGreaterThanOrEqual(36);
  });

  it("walks forward past cells already hinted", () => {
    expect(nextHintIndex(LEN, 36, new Set([36, 37]))).toBe(38);
  });

  it("takes hints mid-word, not only at a word's opening", () => {
    // Progress 33 is one letter into "EVEN" (32..35) — being stuck in
    // the middle of a word is exactly when a hint is worth spending.
    expect(nextHintIndex(LEN, 33, new Set())).toBe(33);
  });

  it("returns null when every remaining cell is hinted", () => {
    expect(nextHintIndex(LEN, 36, new Set([36, 37, 38, 39]))).toBeNull();
  });
});

describe("replayHints", () => {
  it("restores hints the player can still see", () => {
    // A save of one hint taken at nine words in must come back ahead of
    // the snake, not at the first letter of the phrase.
    expect([...replayHints(LEN, 36, 1)]).toEqual([36]);
  });

  it("replays several hints in targeting order", () => {
    expect([...replayHints(LEN, 36, 3)]).toEqual([36, 37, 38]);
  });

  it("restores from the start for an untouched board", () => {
    expect([...replayHints(LEN, 1, 3)]).toEqual([1, 2, 3]);
  });

  it("stops cleanly when the count exceeds the cells left", () => {
    expect(replayHints(LEN, 36, 99).size).toBe(4);
  });

  it("is empty for a save with no hints", () => {
    expect(replayHints(LEN, 36, 0).size).toBe(0);
  });
});
