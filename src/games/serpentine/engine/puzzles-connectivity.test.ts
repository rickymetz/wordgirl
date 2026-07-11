import { describe, it, expect } from "vitest";
import { pickBlocked, isConnected, getPuzzle, getAuthorForDay, getPoolSize, bestGrid } from "./puzzles";
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
    const size = getPoolSize();
    const p1 = getPuzzle("haiku", 0);
    const p2 = getPuzzle("haiku", size);
    expect(p1.id).toBe(p2.id);
    expect(p1.text).toBe(p2.text);
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

  it("returns poem author for poem difficulty", () => {
    const poemAuthor = getAuthorForDay(0, "poem");
    const haikuAuthor = getAuthorForDay(0, "haiku");
    // The haiku author (index 0) and poem author (index 3) differ
    // for the first entry: "Basho" vs "Coleridge"
    expect(poemAuthor).not.toBe(haikuAuthor);
  });

  it("returns correct authors for known entries", () => {
    // First entry: Basho (haiku) / Coleridge (poem)
    expect(getAuthorForDay(0, "haiku")).toBe("Basho");
    expect(getAuthorForDay(0, "poem")).toBe("Coleridge");
  });

  it("wraps index around the pool", () => {
    const size = getPoolSize();
    const a1 = getAuthorForDay(0, "haiku");
    const a2 = getAuthorForDay(size, "haiku");
    expect(a1).toBe(a2);
  });
});
