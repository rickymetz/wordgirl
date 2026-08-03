/**
 * Every word a puzzle has on offer: required AND bonus, across all
 * levels. The denominator a completionist plays against — clearing the
 * required words alone lands well short of it, so the gap is exactly the
 * bonus tier waiting to be swept.
 */
export function totalWords(
  levels: { words: string[]; bonusWords?: string[] }[],
): number {
  return levels.reduce(
    (n, level) => n + level.words.length + (level.bonusWords?.length ?? 0),
    0,
  );
}
