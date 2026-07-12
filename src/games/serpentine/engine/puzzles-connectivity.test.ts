import { describe, it, expect } from "vitest";
import { pickBlocked, isConnected, getPoolSize, getThemedPuzzle, bestGrid } from "./puzzles";
import { seededRandom } from "../../../lib/random";

describe("pickBlocked connectivity", () => {
  const gridConfigs: [number, number, number][] = [
    [3, 3, 7],
    [4, 4, 12],
    [5, 5, 20],
    [6, 6, 28],
    [4, 5, 15],
    [5, 7, 30],
    [8, 10, 60],
    [3, 4, 9],
    [6, 8, 40],
  ];

  for (const [rows, cols, n] of gridConfigs) {
    it(`produces connected live cells for ${rows}x${cols} grid with ${n} live cells`, () => {
      const rand = seededRandom(`test:pickBlocked:${rows}:${cols}:${n}`);
      const blocked = pickBlocked(rows, cols, n, rand);
      expect(isConnected(rows, cols, blocked)).toBe(true);
    });
  }

  it("returns empty set when no cells need blocking", () => {
    const rand = seededRandom("test:no-block");
    const blocked = pickBlocked(4, 4, 16, rand);
    expect(blocked.size).toBe(0);
  });

  it("returns empty set when n exceeds total cells", () => {
    const rand = seededRandom("test:over");
    const blocked = pickBlocked(3, 3, 20, rand);
    expect(blocked.size).toBe(0);
  });

  it("produces connected results across multiple seeds", () => {
    for (let seed = 0; seed < 20; seed++) {
      const rand = seededRandom(`stress:${seed}`);
      const [rows, cols] = bestGrid(15);
      const blocked = pickBlocked(rows, cols, 15, rand);
      expect(isConnected(rows, cols, blocked)).toBe(true);
    }
  });
});

describe("thematic pairing", () => {
  it("same index and salt produce valid puzzles for both difficulties", () => {
    const h = getThemedPuzzle("haiku", 5, "2026-07-12");
    const p = getThemedPuzzle("poem", 5, "2026-07-12");
    expect(h.grid.length).toBeGreaterThan(0);
    expect(p.grid.length).toBeGreaterThan(0);
  });

  it("different salt produces different path for same haiku", () => {
    const h1 = getThemedPuzzle("haiku", 0, "salt-a");
    const h2 = getThemedPuzzle("haiku", 0, "salt-b");
    expect(h1.text).toBe(h2.text);
    expect(h1.path).not.toEqual(h2.path);
  });

  it("wraps index around the pool", () => {
    const size = getPoolSize();
    const p1 = getThemedPuzzle("haiku", 0, "wrap");
    const p2 = getThemedPuzzle("haiku", size, "wrap");
    expect(p1.id).toBe(p2.id);
    expect(p1.text).toBe(p2.text);
  });
});
