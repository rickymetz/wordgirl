import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import { findSlots } from "./generator";
import {
  cellKey,
  dominoCells,
  dominoLetters,
  slotWord,
  type Orientation,
} from "./types";
import {
  TUTORIAL_PUZZLE,
  TUTORIAL_STEP_COUNT,
  tutorialStepIndex,
} from "./tutorial";

const dict = parseDictionary(
  readFileSync(
    new URL("../../../lib/words/dictionary.txt", import.meta.url),
    "utf8",
  ),
);

/** The grid the shipped solution lays down — same math as the reducer. */
function solutionGrid(): Map<string, string> {
  const grid = new Map<string, string>();
  for (const p of TUTORIAL_PUZZLE.solution) {
    const domino = TUTORIAL_PUZZLE.dominoes.find((d) => d.id === p.dominoId)!;
    const [c1, c2] = dominoCells(p.anchor, p.orientation);
    const [l1, l2] = dominoLetters(domino, p.orientation);
    grid.set(cellKey(c1.row, c1.col), l1);
    grid.set(cellKey(c2.row, c2.col), l2);
  }
  return grid;
}

describe("the tutorial board", () => {
  it("is six cells and three dominoes", () => {
    expect(TUTORIAL_PUZZLE.board.cells).toHaveLength(6);
    expect(TUTORIAL_PUZZLE.dominoes).toHaveLength(3);
    expect(TUTORIAL_PUZZLE.solution).toHaveLength(3);
  });

  it("ships the slots findSlots derives from its own shape", () => {
    expect(TUTORIAL_PUZZLE.slots).toEqual(findSlots(TUTORIAL_PUZZLE.board));
  });

  it("covers every cell exactly once", () => {
    const covered: string[] = [];
    for (const p of TUTORIAL_PUZZLE.solution) {
      for (const c of dominoCells(p.anchor, p.orientation)) {
        covered.push(cellKey(c.row, c.col));
      }
    }
    const live = TUTORIAL_PUZZLE.board.cells.map((c) => cellKey(c.row, c.col));
    expect(covered.sort()).toEqual([...live].sort());
  });

  it("spells a real word in every slot", () => {
    const grid = solutionGrid();
    for (const slot of TUTORIAL_PUZZLE.slots) {
      const word = slotWord(slot, grid);
      expect(word).not.toBeNull();
      expect(word!.length).toBeGreaterThanOrEqual(2);
      expect(dict.has(word!.toLowerCase())).toBe(true);
    }
  });

  it("REQUIRES rotating a domino", () => {
    // The reason the board is six cells and not four: on a 2x2 the same
    // letter pairs tile both ways, so a player never has to turn a piece.
    const upright = TUTORIAL_PUZZLE.solution.filter(
      (p) => p.orientation === 1 || p.orientation === 3,
    );
    expect(upright.length).toBeGreaterThanOrEqual(1);
    const flat = TUTORIAL_PUZZLE.solution.filter(
      (p) => p.orientation === 0 || p.orientation === 2,
    );
    expect(flat.length).toBeGreaterThanOrEqual(1);
  });

  it("has exactly one solvable arrangement", () => {
    // Brute-force every tiling x permutation x flip and count the distinct
    // grids that satisfy all slots. More than one and the tutorial's
    // "nothing else will complete the board" is a lie.
    const live = new Set(
      TUTORIAL_PUZZLE.board.cells.map((c) => cellKey(c.row, c.col)),
    );
    const found = new Set<string>();

    const place = (used: Set<string>, remaining: number[]) => {
      if (used.size === live.size) {
        const grid = new Map<string, string>();
        for (const [key, letter] of laid) grid.set(key, letter);
        for (const slot of TUTORIAL_PUZZLE.slots) {
          const word = slotWord(slot, grid);
          if (!word || !dict.has(word.toLowerCase())) return;
        }
        found.add(
          [...live].sort().map((k) => grid.get(k)).join(""),
        );
        return;
      }
      const next = [...live].sort().find((k) => !used.has(k))!;
      const [row, col] = next.split(",").map(Number);
      for (const id of remaining) {
        const domino = TUTORIAL_PUZZLE.dominoes.find((d) => d.id === id)!;
        for (const orientation of [0, 1, 2, 3] as Orientation[]) {
          const [c1, c2] = dominoCells({ row, col }, orientation);
          const k1 = cellKey(c1.row, c1.col);
          const k2 = cellKey(c2.row, c2.col);
          if (k1 !== next) continue; // anchor must be the cell we're filling
          if (!live.has(k2) || used.has(k2)) continue;
          const [l1, l2] = dominoLetters(domino, orientation);
          laid.set(k1, l1);
          laid.set(k2, l2);
          used.add(k1);
          used.add(k2);
          place(
            used,
            remaining.filter((r) => r !== id),
          );
          used.delete(k1);
          used.delete(k2);
          laid.delete(k1);
          laid.delete(k2);
        }
      }
    };
    const laid = new Map<string, string>();
    place(
      new Set(),
      TUTORIAL_PUZZLE.dominoes.map((d) => d.id),
    );

    expect(found.size).toBe(1);
  });
});

describe("tutorialStepIndex", () => {
  const at = (s: Partial<Parameters<typeof tutorialStepIndex>[0]>) =>
    tutorialStepIndex({
      placed: [],
      selectedDominoId: null,
      solved: false,
      ...s,
    });

  it("starts on step one", () => {
    expect(at({})).toBe(0);
  });

  it("advances on selecting, then placing, then standing one on end", () => {
    expect(at({ selectedDominoId: 0 })).toBe(1);
    expect(at({ placed: [{ orientation: 0 }] })).toBe(2);
    expect(at({ placed: [{ orientation: 0 }, { orientation: 1 }] })).toBe(3);
  });

  it("reports the script finished only when solved", () => {
    expect(at({ solved: true })).toBe(TUTORIAL_STEP_COUNT);
  });
});
