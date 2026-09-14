import { describe, expect, it } from "vitest";
import { adjacentIn } from "./GamePager";
import { games } from "../games/registry";

describe("adjacentIn", () => {
  const ids = ["a", "b", "c"];
  it("steps forward and back", () => {
    expect(adjacentIn(ids, "b", 1)).toBe("c");
    expect(adjacentIn(ids, "b", -1)).toBe("a");
  });
  it("wraps at both ends — the pager is a carousel, not a strip", () => {
    expect(adjacentIn(ids, "c", 1)).toBe("a");
    expect(adjacentIn(ids, "a", -1)).toBe("c");
  });
  it("a full lap in either direction visits every game once", () => {
    const lap = (dir: 1 | -1) => {
      const seen: string[] = [];
      let id = games[0].id;
      for (let i = 0; i < games.length; i++) {
        seen.push(id);
        id = adjacentIn(
          games.map((g) => g.id),
          id,
          dir,
        );
      }
      return { seen, back: id };
    };
    for (const dir of [1, -1] as const) {
      const { seen, back } = lap(dir);
      expect(new Set(seen).size).toBe(games.length);
      expect(back).toBe(games[0].id);
    }
  });
});

describe("pager routes", () => {
  it("every game reaches both pager pages — the cycle can never 404", () => {
    for (const game of games) {
      const paths = (game.extraRoutes ?? []).map((r) => r.path);
      for (const page of ["archive", "stats"]) {
        expect(paths, `${game.id} is missing the ${page} route`).toContain(
          page,
        );
      }
    }
  });
});
