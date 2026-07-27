/**
 * Phrase layout for the letters readout above the grid.
 *
 * A puzzle's `text` carries the poet's typography: spaces separate
 * words, and any other non-letter is a punctuation mark to draw where
 * it stands — a hyphen inside a compound (APPLE-TREE), an apostrophe
 * for an elision or a possessive (O'ER, LIFE'S).
 *
 * Only A–Z map to grid cells, so every mark is display-only and must
 * not disturb the letter indices the snake path is numbered by. That
 * is the whole reason this splitting is not a `text.split(" ")`.
 */

export type PhraseToken =
  /** A letter of the solution, at its index along the path. */
  | { kind: "letter"; index: number }
  /** Punctuation, drawn between letters but absent from the grid. */
  | { kind: "mark"; char: string };

export interface PhraseWord {
  /** Letter index the word starts at — stable enough for a React key. */
  start: number;
  tokens: PhraseToken[];
}

/**
 * Split `text` into display words at its spaces and em dashes. Each
 * word keeps its letters and marks interleaved, so the readout can draw
 * a word as one unbreakable run. Runs of spaces collapse; a word of pure
 * punctuation is dropped, having nothing to anchor to.
 */
export function phraseWords(text: string): PhraseWord[] {
  const words: PhraseWord[] = [];
  let letterIndex = 0;
  let tokens: PhraseToken[] = [];
  let wordStart = 0;

  const closeWord = () => {
    if (tokens.some((t) => t.kind === "letter")) {
      words.push({ start: wordStart, tokens });
    }
    tokens = [];
    wordStart = letterIndex;
  };

  for (const ch of text) {
    if (ch === " ") closeWord();
    else if (ch >= "A" && ch <= "Z") tokens.push({ kind: "letter", index: letterIndex++ });
    else {
      tokens.push({ kind: "mark", char: ch });
      // An em dash joins two whole words (TO—UNITE), so the line may
      // break after it. A hyphen binds a compound and may not.
      if (ch === "—") closeWord();
    }
  }
  closeWord();

  return words;
}

/**
 * Path indices of the letters the puzzle GIVES: the first letter of
 * every word, shown in the readout from the outset.
 *
 * It reads the same splitting the readout draws with, so "word" means
 * one thing in this game: a space or an em dash starts a new one, a
 * hyphen or an apostrophe does not, and a compound (APPLE-TREE) is one
 * word with one given letter rather than two.
 *
 * Letters only — where each one SITS is still the puzzle. Index 0 is a
 * special case: it is also the snake's given start cell, so the board
 * shows its position too.
 */
export function wordStartIndices(text: string): number[] {
  return phraseWords(text).map((w) => w.start);
}
