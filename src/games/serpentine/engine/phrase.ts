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
 * Split `text` into display words at its spaces. Each word keeps its
 * letters and marks interleaved, so the readout can draw a word as one
 * unbreakable run. Runs of spaces collapse; a word of pure punctuation
 * is dropped, having nothing to anchor to.
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
    else tokens.push({ kind: "mark", char: ch });
  }
  closeWord();

  return words;
}
