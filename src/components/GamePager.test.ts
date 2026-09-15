import { describe, expect, it } from "vitest";
import { adjacentIn, commitDirection, dragIntent } from "./GamePager";
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

describe("dragIntent", () => {
  it("takes a clear sideways move", () => {
    expect(dragIntent(12, 2)).toBe("horizontal");
    expect(dragIntent(-40, 10)).toBe("horizontal");
  });

  it("waits while the gesture is still too small to read", () => {
    expect(dragIntent(4, 3)).toBe("pending");
    expect(dragIntent(0, 12)).toBe("pending");
  });

  it("stands down for a scroll", () => {
    expect(dragIntent(3, 40)).toBe("vertical");
    expect(dragIntent(-10, -60)).toBe("vertical");
  });

  it("keeps the arc of a thumb swipe — the pivot is not a scroll", () => {
    // A thumb hinges at its base, so an intentional side-swipe opens
    // downward. A bare 45° test called this a scroll and dropped the
    // drag before it started; that is what made the pager feel like it
    // only worked "if you swipe just so".
    expect(dragIntent(14, 18)).toBe("horizontal");
    expect(dragIntent(20, 26)).toBe("horizontal");
  });
});

describe("commitDirection", () => {
  const pitch = 390; // a phone

  it("turns the page on a long slow drag", () => {
    expect(commitDirection({ dx: -120, vx: 0, pitch })).toBe(1);
    expect(commitDirection({ dx: 120, vx: 0, pitch })).toBe(-1);
  });

  it("turns the page on a flick, however short", () => {
    expect(commitDirection({ dx: -60, vx: -0.6, pitch })).toBe(1);
    expect(commitDirection({ dx: -30, vx: -0.9, pitch })).toBe(1);
  });

  it("does not turn on a fast twitch that barely moved", () => {
    expect(commitDirection({ dx: -8, vx: -0.9, pitch })).toBe(0);
  });

  it("turns the page on the ordinary middle swipe that used to fail", () => {
    // ~85px at a moderate 0.25px/ms: too short for the old distance
    // rule, too slow for the old flick rule, so it sprang back.
    expect(commitDirection({ dx: -85, vx: -0.25, pitch })).toBe(1);
  });

  it("springs back when a short drag decelerates to a stop", () => {
    // Hesitation: pulled a little, thought better of it, stopped, let
    // go. Traced from a real recording, where it read as a non-swipe.
    expect(commitDirection({ dx: 50, vx: 0.17, pitch: 393 })).toBe(0);
  });

  it("springs back on a nudge", () => {
    expect(commitDirection({ dx: -20, vx: 0, pitch })).toBe(0);
    expect(commitDirection({ dx: -30, vx: -0.05, pitch })).toBe(0);
  });

  it("springs back when the finger reverses to cancel", () => {
    expect(commitDirection({ dx: -100, vx: 2, pitch })).toBe(0);
  });

  it("takes a stricter fraction for a cancelled gesture", () => {
    expect(commitDirection({ dx: -95, vx: 0, pitch }, 0.28)).toBe(0);
    expect(commitDirection({ dx: -120, vx: 0, pitch }, 0.28)).toBe(1);
  });
});
