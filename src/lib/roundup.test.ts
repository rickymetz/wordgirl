import { describe, expect, it } from "vitest";
import {
  buildRoundupText,
  roundupDetail,
  roundupShareLine,
  type RoundupEntry,
} from "./roundup";
import { SHARE_URL } from "./share";

const polygram: RoundupEntry = {
  emoji: "🔻",
  name: "Polygram",
  metric: "42 words",
  elapsedMs: 3 * 60_000 + 21_000,
};
const pierglass: RoundupEntry = {
  emoji: "🪞",
  name: "Pierglass",
  metric: "6 rows · par",
  elapsedMs: 2 * 60_000 + 10_000,
};

describe("roundupShareLine", () => {
  it("leads with the emoji and closes with the timer", () => {
    expect(roundupShareLine(polygram)).toBe("🔻 Polygram · 42 words · ⏱️ 3:21");
  });
});

describe("roundupDetail", () => {
  it("carries no emoji and no game name — those live beside it in the card", () => {
    const detail = roundupDetail(polygram);
    expect(detail).toBe("42 words · 3:21");
    expect(detail).not.toContain("🔻");
    expect(detail).not.toContain("Polygram");
  });
});

describe("buildRoundupText", () => {
  it("stacks a dated header, a line per game, and the link with no blank lines", () => {
    const text = buildRoundupText("2026-08-25", [polygram, pierglass]);
    expect(text).toBe(
      [
        "WordGirl — August 25",
        "🔻 Polygram · 42 words · ⏱️ 3:21",
        "🪞 Pierglass · 6 rows · par · ⏱️ 2:10",
        SHARE_URL,
      ].join("\n"),
    );
    // Tight — the house rule for every share string.
    expect(text).not.toContain("\n\n");
  });

  it("keeps the games in the order it is handed", () => {
    const text = buildRoundupText("2026-08-25", [pierglass, polygram]);
    const lines = text.split("\n");
    expect(lines[1]).toContain("Pierglass");
    expect(lines[2]).toContain("Polygram");
  });
});
