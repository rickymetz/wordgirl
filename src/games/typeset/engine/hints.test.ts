import { describe, expect, it } from "vitest";
import { dateKeyRange } from "../../../lib/date";
import { describeCard, hintText, nextHint, NO_HINTS, searchSpace, type HintState } from "./hints";
import { dailyBoard } from "./schedule";
import { tripleKey } from "./sets";

const board = dailyBoard("2026-10-07", "charset");

describe("hints", () => {
  it("describes one target set, gentlest fact first, until it is fully described", () => {
    let state: HintState = NO_HINTS;
    let last = Infinity;
    const attrs: string[] = [];
    for (let i = 0; i < 4; i++) {
      const step = nextHint(board, [], state);
      expect(step).not.toBeNull();
      state = step!.state;
      const space = searchSpace(board.cards, state.facts);
      expect(space).toBeLessThanOrEqual(last);
      last = space;
      attrs.push(step!.fact.attribute);
    }
    expect(new Set(attrs).size).toBe(4);
    expect(nextHint(board, [], state)).toBeNull();
    // Four facts pin the target: it is the only set left in the space.
    expect(state.target).toBe(tripleKey(board.sets[0]));
  });

  it("moves to a new target once the old one is found", () => {
    const first = nextHint(board, [], NO_HINTS)!;
    const after = nextHint(board, [first.state.target!], first.state)!;
    expect(after.state.target).not.toBe(first.state.target);
    expect(after.state.facts).toHaveLength(1);
  });

  it("has nothing to say when every set is found", () => {
    expect(nextHint(board, board.sets.map(tripleKey), NO_HINTS)).toBeNull();
  });

  it("writes every fact as a plain sentence", () => {
    let state: HintState = NO_HINTS;
    for (let i = 0; i < 4; i++) {
      const step = nextHint(board, [], state)!;
      expect(hintText(board, step.fact)).toMatch(/^An unfound set (is|has) .+\.$/);
      state = step.state;
    }
    expect(describeCard(board, [1, 1, 2, 2])).toBe(`2 blue open ${board.glyphs[1].plural}`);
  });

  it("leads with a fact that leaves most of the board in play (measured over 60 days)", () => {
    const firstSpaces: number[] = [];
    for (const d of dateKeyRange("2026-10-01", "2026-11-29"))
      for (const kind of ["charset", "faces"] as const) {
        const b = dailyBoard(d, kind);
        const step = nextHint(b, [], NO_HINTS)!;
        firstSpaces.push(searchSpace(b.cards, step.state.facts) / 220);
      }
    const mean = firstSpaces.reduce((a, b) => a + b, 0) / firstSpaces.length;
    // A first hint should leave at least a fifth of the 220 triples in play.
    expect(mean).toBeGreaterThan(0.2);
  });
});
