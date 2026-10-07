/**
 * The Set rules, independent of what the cards look like.
 *
 * A card is four attribute values, each 0–2: which of the day's three
 * glyphs, how many copies (1–3), which ink, which fill. Three cards make
 * a set when, attribute by attribute, they are all the same or all
 * different — which for values in {0,1,2} is exactly "the three values
 * sum to a multiple of 3".
 */

export type Value = 0 | 1 | 2;

/** [glyph, count, color, fill] — count is stored 0-based (0 = one copy). */
export type Card = readonly [Value, Value, Value, Value];

/** Indexes into a board's cards, ascending. */
export type Triple = readonly [number, number, number];

export const ATTRIBUTES = ["glyph", "count", "color", "fill"] as const;
export type Attribute = (typeof ATTRIBUTES)[number];

/** Every card in the 81-card deck, in a fixed order. */
export const DECK: readonly Card[] = (() => {
  const deck: Card[] = [];
  for (let g = 0; g < 3; g++)
    for (let n = 0; n < 3; n++)
      for (let c = 0; c < 3; c++)
        for (let f = 0; f < 3; f++) deck.push([g, n, c, f] as unknown as Card);
  return deck;
})();

export function isSet(a: Card, b: Card, c: Card): boolean {
  for (let i = 0; i < 4; i++) if ((a[i] + b[i] + c[i]) % 3 !== 0) return false;
  return true;
}

/** The unique card completing a set with `a` and `b`. */
export function thirdCard(a: Card, b: Card): Card {
  return a.map((v, i) => ((6 - v - b[i]) % 3) as Value) as unknown as Card;
}

/** Every set on a board, as ascending index triples in lexicographic order. */
export function findSets(cards: readonly Card[]): Triple[] {
  const sets: Triple[] = [];
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++)
      for (let k = j + 1; k < cards.length; k++)
        if (isSet(cards[i], cards[j], cards[k])) sets.push([i, j, k]);
  return sets;
}

/** Stable key for a triple ("2,5,9"), independent of selection order. */
export function tripleKey(indexes: readonly number[]): string {
  return [...indexes].sort((a, b) => a - b).join(",");
}

/** For each attribute, whether the set's three cards share the value. */
export function sameAttributes(a: Card, b: Card, c: Card): boolean[] {
  return [0, 1, 2, 3].map((i) => a[i] === b[i] && b[i] === c[i]);
}

export interface DealOptions {
  /** Cards on the board. */
  size: number;
  /** Inclusive bounds on how many sets the board may contain. */
  minSets: number;
  maxSets: number;
}

export const DAILY_DEAL: DealOptions = { size: 12, minSets: 4, maxSets: 8 };

export interface Deal {
  cards: Card[];
  sets: Triple[];
}

/**
 * Deal a board whose set count lands in [minSets, maxSets]. A random
 * 12-card hand averages under three sets, so this rejection-samples;
 * roughly one hand in four qualifies, so the loop ends in a handful of
 * tries. The bound is a guard against impossible options, not a tuning
 * knob.
 */
export function deal(rand: () => number, options: DealOptions = DAILY_DEAL): Deal {
  for (let attempt = 0; attempt < 10_000; attempt++) {
    const pool = DECK.slice();
    const cards: Card[] = [];
    for (let k = 0; k < options.size; k++) {
      const pick = Math.floor(rand() * pool.length);
      cards.push(pool[pick]);
      pool.splice(pick, 1);
    }
    const sets = findSets(cards);
    if (sets.length >= options.minSets && sets.length <= options.maxSets) return { cards, sets };
  }
  throw new Error(`typeset: no ${options.size}-card deal with ${options.minSets}–${options.maxSets} sets`);
}
