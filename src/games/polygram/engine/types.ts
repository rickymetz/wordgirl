export interface Puzzle {
  /** "daily:2026-07-06" or "practice:<random>" */
  seed: string;
  dictVersion: number;
  /**
   * Letters in join order: letters[0..2] are the triangle level,
   * letters[3] joins at the square level, and so on.
   */
  letters: string[];
  /** levels[0] is level 3 (triangle), levels[1] is level 4 (square)… */
  levels: LevelSpec[];
  /** Size of the final polygon with at least one valid word. */
  maxLevel: number;
  /** Every word on offer, required and bonus, across all levels. */
  totalWords: number;
}

export interface LevelSpec {
  /** Word length and polygon vertex count: 3, 4, 5… */
  size: number;
  /**
   * Every REQUIRED word for this level: exactly `size` letters long,
   * drawn from the first `size` puzzle letters, reuse allowed. All must
   * be found to advance.
   */
  words: string[];
  /**
   * Rarer same-length words — never required, never hinted, invisible
   * until found. There for the sweep.
   */
  bonusWords: string[];
}
