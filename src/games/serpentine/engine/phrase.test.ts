import { describe, expect, it } from "vitest";
import { phraseWords, wordStartIndices, type PhraseToken } from "./phrase";

const letter = (index: number): PhraseToken => ({ kind: "letter", index });
const mark = (char: string): PhraseToken => ({ kind: "mark", char });

/** Compact reading of a word: letters as their indices, marks as the glyph. */
const shape = (text: string) =>
  phraseWords(text).map((w) =>
    w.tokens.map((t) => (t.kind === "letter" ? t.index : t.char)),
  );

describe("phraseWords", () => {
  it("splits on spaces and numbers letters continuously", () => {
    expect(shape("OLD POND")).toEqual([
      [0, 1, 2],
      [3, 4, 5, 6],
    ]);
  });

  it("keeps a hyphenated compound as one unbreakable word", () => {
    expect(phraseWords("AN APPLE-TREE")[1]).toEqual({
      start: 2,
      tokens: [
        letter(2), letter(3), letter(4), letter(5), letter(6),
        mark("-"),
        letter(7), letter(8), letter(9), letter(10),
      ],
    });
  });

  it("carries an apostrophe without spending a letter index", () => {
    expect(shape("O'ER THE MEAD")).toEqual([
      [0, "'", 1, 2],
      [3, 4, 5],
      [6, 7, 8, 9],
    ]);
  });

  it("breaks the line after an em dash but not after a hyphen", () => {
    // TO—UNITE is two words the line may wrap between; the dash stays
    // with the word it followed.
    expect(shape("FLY TO—UNITE IT")).toEqual([
      [0, 1, 2],
      [3, 4, "—"],
      [5, 6, 7, 8, 9],
      [10, 11],
    ]);
  });

  it("handles a mark at either end of a word", () => {
    expect(shape("'TIS LIFE'S")).toEqual([
      ["'", 0, 1, 2],
      [3, 4, 5, 6, "'", 7],
    ]);
  });

  it("never lets marks consume letter indices", () => {
    const text = "SO WE'LL GO NO MORE A-ROVING";
    const last = phraseWords(text).at(-1)!.tokens.at(-1)!;
    expect(last).toEqual(letter(text.replace(/[^A-Z]/g, "").length - 1));
  });

  it("collapses repeated spaces and drops a word with no letters", () => {
    expect(shape("  OH  -- MY ")).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it("returns nothing for an empty phrase", () => {
    expect(phraseWords("")).toEqual([]);
  });
});

describe("wordStartIndices", () => {
  // The letters every puzzle gives away: one per word, in the readout.
  const TEXT = "A WORLD OF GRIEF AND PAIN FLOWERS BLOOM EVEN THEN";

  it("maps each word to its path index", () => {
    expect(wordStartIndices(TEXT)).toEqual([0, 1, 6, 8, 13, 16, 20, 27, 32, 36]);
  });

  it("ignores punctuation and repeated spaces", () => {
    expect(wordStartIndices("OH,  MY WORD!")).toEqual([0, 2, 4]);
  });

  it("gives a punctuated word one letter, at its opening", () => {
    // Neither the apostrophe nor the hyphen opens a new word, so a
    // compound gives one letter, not one per fragment.
    expect(wordStartIndices("'TIS AN APPLE-TREE O'ER THE MEAD")).toEqual([
      0, 3, 5, 14, 17, 20,
    ]);
  });

  it("opens a new word after an em dash", () => {
    // An em dash separates two whole words, so UNITE gets its U.
    expect(wordStartIndices("FLY TO—UNITE IT")).toEqual([0, 3, 5, 10]);
  });

  it("returns nothing for an empty phrase", () => {
    expect(wordStartIndices("")).toEqual([]);
  });
});
