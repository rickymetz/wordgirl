/**
 * Hints name a property of one set the player hasn't found:
 * "An unfound set is all blue", "…has one of each fill".
 *
 * Every hint is about the same TARGET set (the first unfound set in board
 * order) until it is found, so successive hints add up rather than
 * scatter. The order is measured, not hand-picked: each hint is the fact
 * about the target that leaves the most candidate triples on the board,
 * given the facts already shown — gentlest first. A "same" fact ("all
 * blue") cuts the board to the four-odd blue cards; a "different" fact
 * ("one of each color") barely narrows on its own, so it usually leads.
 * hints.measure.test.ts reports how much each step narrows across a run
 * of real days.
 */
import { FACES } from "./faces";
import type { Board } from "./schedule";
import { ATTRIBUTES, type Attribute, type Card, type Triple, tripleKey } from "./sets";

export interface HintFact {
  attribute: Attribute;
  /** True: the target's three cards share `value`. False: all differ. */
  same: boolean;
  value: number;
}

export interface HintState {
  /** tripleKey of the set the hints describe, or null before the first hint. */
  target: string | null;
  /** Facts already shown about the target, in order. */
  facts: HintFact[];
}

export const NO_HINTS: HintState = { target: null, facts: [] };

const COUNTS = ["one", "two", "three"];
const COLORS = ["red", "amber", "blue"];
const FILLS = ["solid", "cross-hatched", "open"];

function factsFor(cards: readonly Card[], set: Triple): HintFact[] {
  const [a, b, c] = set.map((i) => cards[i]);
  return ATTRIBUTES.map((attribute, i) => ({ attribute, same: a[i] === b[i] && b[i] === c[i], value: a[i] }));
}

function satisfies(cards: readonly Card[], triple: readonly number[], fact: HintFact): boolean {
  const i = ATTRIBUTES.indexOf(fact.attribute);
  const [x, y, z] = triple.map((t) => cards[t][i]);
  return fact.same ? x === fact.value && y === fact.value && z === fact.value : x !== y && y !== z && x !== z;
}

/** How many of the board's triples (sets or not) are consistent with every fact. */
export function searchSpace(cards: readonly Card[], facts: readonly HintFact[]): number {
  let n = 0;
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++)
      for (let k = j + 1; k < cards.length; k++)
        if (facts.every((f) => satisfies(cards, [i, j, k], f))) n++;
  return n;
}

/**
 * The next hint, or null when the target is fully described (all four
 * facts shown) or every set is found. Pure: the caller stores the state.
 */
export function nextHint(board: Board, found: readonly string[], prior: HintState): { fact: HintFact; state: HintState } | null {
  const unfound = board.sets.filter((s) => !found.includes(tripleKey(s)));
  if (unfound.length === 0) return null;
  const keep = prior.target !== null && unfound.some((s) => tripleKey(s) === prior.target);
  const target = keep ? unfound.find((s) => tripleKey(s) === prior.target)! : unfound[0];
  const shown = keep ? prior.facts : [];
  const remaining = factsFor(board.cards, target).filter((f) => !shown.some((s) => s.attribute === f.attribute));
  if (remaining.length === 0) return null;
  let best = remaining[0];
  let bestSpace = -1;
  for (const f of remaining) {
    const space = searchSpace(board.cards, [...shown, f]);
    if (space > bestSpace) {
      best = f;
      bestSpace = space;
    }
  }
  return { fact: best, state: { target: tripleKey(target), facts: [...shown, best] } };
}

/** The hint as a sentence. */
export function hintText(board: Board, fact: HintFact): string {
  if (!fact.same) {
    switch (fact.attribute) {
      case "glyph":
        return board.kind === "faces" ? "An unfound set has three different faces." : "An unfound set has three different characters.";
      case "count":
        return "An unfound set has one, two and three.";
      case "color":
        return "An unfound set has one of each color.";
      case "fill":
        return "An unfound set has one of each fill.";
    }
  }
  switch (fact.attribute) {
    case "glyph": {
      const g = board.glyphs[fact.value];
      return board.kind === "faces" ? `An unfound set is all ${FACES[g.face].name}.` : `An unfound set is all ${g.plural}.`;
    }
    case "count":
      return `An unfound set has ${COUNTS[fact.value]} on every card.`;
    case "color":
      return `An unfound set is all ${COLORS[fact.value]}.`;
    case "fill":
      return `An unfound set is all ${FILLS[fact.value]}.`;
  }
}

/** Screen-reader / aria description of a card: "2 blue open euro signs". */
export function describeCard(board: Board, card: Card): string {
  const g = board.glyphs[card[0]];
  const n = card[1] + 1;
  return `${n} ${COLORS[card[2]]} ${FILLS[card[3]]} ${n === 1 ? g.name : g.plural}`;
}
