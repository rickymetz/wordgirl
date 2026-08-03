/**
 * The words a puzzle actually ASKS for: the required tier, across every
 * level. This is the denominator a result can honestly be stated
 * against.
 *
 * It deliberately excludes the bonus tier. That tier is not a curated
 * set of extras — dictionary v11 made it "whatever is left after the
 * common-frequency cut", so it is an enumeration of every remaining
 * legal word the letters can spell. Measured across 120 dailies it
 * averages 142 words against 17 required, and its size swings from 3 to
 * 615. Counting it made a solved board read as "24 of 433 words".
 *
 * Bonus words are texture: a good surprise when a rare one lands, never
 * a total to chase. They are reported as an additive count with no
 * ceiling, which is the only honest way to show something unbounded.
 */
export function requiredWords(levels: { words: string[] }[]): number {
  return levels.reduce((n, level) => n + level.words.length, 0);
}

/** How many of `found` came from the bonus tier. */
export function bonusFound(
  levels: { words?: string[]; bonusWords?: string[] }[],
  found: readonly string[],
): number {
  const bonus = new Set(levels.flatMap((l) => l.bonusWords ?? []));
  return found.filter((w) => bonus.has(w)).length;
}
