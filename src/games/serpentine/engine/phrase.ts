/**
 * Phrase layout for the letters readout above the grid.
 *
 * A puzzle's `text` carries the poet's word breaks: spaces separate
 * words, hyphens join a compound the poet hyphenated (APPLE-TREE).
 * Only A–Z map to grid cells, so both separators are display-only —
 * the readout has to place them without disturbing the letter indices
 * the snake path is numbered by.
 */

export interface PhraseWord {
  /** Letter index of the word's first letter. */
  start: number;
  /** Hyphen-separated `[start, end)` letter runs inside the word. */
  segments: [number, number][];
}

/**
 * Split `text` into display words. Each word is one or more letter
 * runs; a run boundary inside a word is a hyphen to draw. Runs of
 * spaces, and hyphens with no letters on one side, collapse away.
 */
export function phraseWords(text: string): PhraseWord[] {
  const words: PhraseWord[] = [];
  let letterIndex = 0;
  let segments: [number, number][] = [];
  let runStart = 0;

  const closeSegment = () => {
    if (letterIndex > runStart) segments.push([runStart, letterIndex]);
    runStart = letterIndex;
  };
  const closeWord = () => {
    closeSegment();
    if (segments.length > 0) words.push({ start: segments[0][0], segments });
    segments = [];
  };

  for (const ch of text) {
    if (ch === " ") closeWord();
    else if (ch === "-") closeSegment();
    else letterIndex++;
  }
  closeWord();

  return words;
}
