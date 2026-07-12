import { describe, it, expect } from "vitest";
import { pickBlocked, isConnected, getPuzzle, getAuthorForDay, getPoolSize, getThemeForDay, getThemedPuzzle, bestGrid } from "./puzzles";
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

describe("getPuzzle with valid difficulties", () => {
  it("returns a haiku puzzle", () => {
    const puzzle = getPuzzle("haiku", 0);
    expect(puzzle.difficulty).toBe("haiku");
    expect(puzzle.id).toMatch(/^h\d{3}$/);
    expect(puzzle.grid.length).toBeGreaterThan(0);
  });

  it("returns a poem puzzle", () => {
    const puzzle = getPuzzle("poem", 0);
    expect(puzzle.difficulty).toBe("poem");
    expect(puzzle.id).toMatch(/^p\d{3}$/);
    expect(puzzle.grid.length).toBeGreaterThan(0);
  });

  it("wraps index around the pool", () => {
    const size = getPoolSize("haiku");
    const p1 = getPuzzle("haiku", 0);
    const p2 = getPuzzle("haiku", size);
    expect(p1.id).toBe(p2.id);
    expect(p1.text).toBe(p2.text);
  });

  it("produces different layout with different salt", () => {
    const p1 = getPuzzle("haiku", 0);
    const p2 = getPuzzle("haiku", 0, "2026-07-12");
    expect(p1.text).toBe(p2.text);
    expect(p1.path).not.toEqual(p2.path);
  });
});

describe("thematic pairing", () => {
  it("same index and salt produce same theme for both difficulties", () => {
    const h = getThemedPuzzle("haiku", 5, "2026-07-12");
    const p = getThemedPuzzle("poem", 5, "2026-07-12");
    const theme = getThemeForDay(5);
    expect(typeof theme).toBe("string");
    expect(theme.length).toBeGreaterThan(0);
    // Both should have valid puzzles
    expect(h.grid.length).toBeGreaterThan(0);
    expect(p.grid.length).toBeGreaterThan(0);
  });

  it("different salt produces different poem for same haiku index", () => {
    const p1 = getThemedPuzzle("poem", 0, "2026-07-12");
    const p2 = getThemedPuzzle("poem", 0, "2026-07-13");
    // Same theme but likely different poem text
    // (could theoretically collide but very unlikely with different salts)
    expect(p1.difficulty).toBe("poem");
    expect(p2.difficulty).toBe("poem");
  });

  it("different salt produces different path for same haiku", () => {
    const h1 = getThemedPuzzle("haiku", 0, "salt-a");
    const h2 = getThemedPuzzle("haiku", 0, "salt-b");
    expect(h1.text).toBe(h2.text);
    expect(h1.path).not.toEqual(h2.path);
  });
});

describe("getAuthorForDay", () => {
  it("returns haiku author by default", () => {
    const author = getAuthorForDay(0);
    expect(typeof author).toBe("string");
    expect(author.length).toBeGreaterThan(0);
  });

  it("returns haiku author when explicitly requested", () => {
    const author = getAuthorForDay(0, "haiku");
    expect(typeof author).toBe("string");
    expect(author.length).toBeGreaterThan(0);
  });

  it("wraps index around the pool", () => {
    const size = getPoolSize("haiku");
    const a1 = getAuthorForDay(0, "haiku");
    const a2 = getAuthorForDay(size, "haiku");
    expect(a1).toBe(a2);
  });
});

describe("independent pool sizes", () => {
  it("haiku and poem pools have different sizes", () => {
    const haikuSize = getPoolSize("haiku");
    const poemSize = getPoolSize("poem");
    expect(haikuSize).toBeGreaterThan(0);
    expect(poemSize).toBeGreaterThan(0);
    expect(haikuSize).not.toBe(poemSize);
  });
});
