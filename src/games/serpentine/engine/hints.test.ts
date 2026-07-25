import { describe, expect, it } from "vitest";
import { nextHintIndex, replayHints, wordStartIndices } from "./hints";

// "A WORLD OF GRIEF AND PAIN FLOWERS BLOOM EVEN THEN" — the 2026-07-24
// daily. Ten words, forty letters.
const TEXT = "A WORLD OF GRIEF AND PAIN FLOWERS BLOOM EVEN THEN";
const STARTS = [0, 1, 6, 8, 13, 16, 20, 27, 32, 36];
const LEN = 40;

describe("wordStartIndices", () => {
  it("maps each word to its path index", () => {
    expect(wordStartIndices(TEXT)).toEqual(STARTS);
  });

  it("ignores punctuation and repeated spaces", () => {
    expect(wordStartIndices("OH,  MY WORD!")).toEqual([0, 2, 4]);
  });

  it("hints a punctuated word once, at its first letter", () => {
    // Neither the apostrophe nor the hyphen opens a new word, so a
    // compound costs one hint, not one per fragment.
    expect(wordStartIndices("'TIS AN APPLE-TREE O'ER THE MEAD")).toEqual([
      0, 3, 5, 14, 17, 20,
    ]);
  });

  it("opens a new word after an em dash", () => {
    // An em dash separates two whole words, so UNITE is hintable.
    expect(wordStartIndices("FLY TO—UNITE IT")).toEqual([0, 3, 5, 10]);
  });
});

describe("nextHintIndex", () => {
  it("reveals the next word start ahead of the player", () => {
    // Nine of ten words placed: the next hint opens "THEN".
    expect(nextHintIndex(STARTS, LEN, 36, new Set())).toBe(36);
  });

  it("never targets a cell the snake already covers", () => {
    const idx = nextHintIndex(STARTS, LEN, 36, new Set());
    expect(idx).toBeGreaterThanOrEqual(36);
  });

  it("skips word starts that are already hinted", () => {
    expect(nextHintIndex(STARTS, LEN, 20, new Set([20, 27]))).toBe(32);
  });

  it("mid-word, aims at the following word rather than the current one", () => {
    // Progress 33 is one letter into "EVEN" (32..35).
    expect(nextHintIndex(STARTS, LEN, 33, new Set())).toBe(36);
  });

  it("falls back to sequential fill once word starts run out", () => {
    const hinted = new Set([36]);
    expect(nextHintIndex(STARTS, LEN, 36, hinted)).toBe(37);
  });

  it("returns null when every remaining cell is hinted", () => {
    const hinted = new Set([36, 37, 38, 39]);
    expect(nextHintIndex(STARTS, LEN, 36, hinted)).toBeNull();
  });
});

describe("replayHints", () => {
  it("restores hints the player can still see", () => {
    // A save of one hint taken at nine words in must come back as the
    // opening letter of "THEN", not the first letter of the phrase.
    expect([...replayHints(STARTS, LEN, 36, 1)]).toEqual([36]);
  });

  it("replays several hints in targeting order", () => {
    expect([...replayHints(STARTS, LEN, 36, 3)]).toEqual([36, 37, 38]);
  });

  it("restores from the start for an untouched board", () => {
    expect([...replayHints(STARTS, LEN, 0, 3)]).toEqual([0, 1, 6]);
  });

  it("stops cleanly when the count exceeds the cells left", () => {
    expect(replayHints(STARTS, LEN, 36, 99).size).toBe(4);
  });

  it("is empty for a save with no hints", () => {
    expect(replayHints(STARTS, LEN, 36, 0).size).toBe(0);
  });
});
