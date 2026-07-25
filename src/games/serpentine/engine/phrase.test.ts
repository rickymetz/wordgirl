import { describe, expect, it } from "vitest";
import { phraseWords, type PhraseToken } from "./phrase";

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
