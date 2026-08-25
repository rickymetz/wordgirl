import { describe, expect, it } from "vitest";
import {
  buildRoundupText,
  consecutiveDaysEndingToday,
  roundupDetail,
  roundupShareLine,
  roundupSummary,
  roundupTotalMs,
  type RoundupEntry,
} from "./roundup";
import { SHARE_URL } from "./share";

const polygram: RoundupEntry = {
  emoji: "🔻",
  name: "Polygram",
  metric: "42 words",
  elapsedMs: 3 * 60_000 + 21_000,
  hints: 0,
};
const pierglass: RoundupEntry = {
  emoji: "🪞",
  name: "Pierglass",
  metric: "6 rows",
  elapsedMs: 2 * 60_000 + 10_000,
  hints: 2,
};

describe("roundupShareLine", () => {
  it("leads with the emoji, closes with the hint tail (no hints)", () => {
    expect(roundupShareLine(polygram)).toBe(
      "🔻 Polygram · 42 words · ⏱️ 3:21 · 🤓 0",
    );
  });
  it("shows the hint count behind the peeking face when hints were used", () => {
    expect(roundupShareLine(pierglass)).toBe(
      "🪞 Pierglass · 6 rows · ⏱️ 2:10 · 🫣 2",
    );
  });
});

describe("roundupDetail", () => {
  it("carries no emoji and no game name, and says hints in words", () => {
    const detail = roundupDetail(polygram);
    expect(detail).toBe("42 words · 3:21 · no hints");
    expect(detail).not.toContain("🔻");
    expect(detail).not.toContain("Polygram");
  });
  it("pluralises hints and never leaks an emoji", () => {
    expect(roundupDetail(pierglass)).toBe("6 rows · 2:10 · 2 hints");
    expect(roundupDetail({ ...pierglass, hints: 1 })).toBe("6 rows · 2:10 · 1 hint");
  });
});

describe("roundupTotalMs / roundupSummary", () => {
  it("sums play time across games", () => {
    expect(roundupTotalMs([polygram, pierglass])).toBe(331_000);
  });
  it("says all-solved and total time, and adds the streak only past day one", () => {
    expect(roundupSummary([polygram, pierglass], 1)).toBe("2/2 solved · 5:31");
    expect(roundupSummary([polygram, pierglass], 4)).toBe(
      "2/2 solved · 5:31 · 4-day streak",
    );
  });
});

describe("consecutiveDaysEndingToday", () => {
  it("counts today plus each unbroken prior complete day", () => {
    const set = new Set(["2026-08-24", "2026-08-23", "2026-08-21"]);
    // today + 24 + 23, then 22 is missing -> stops.
    expect(consecutiveDaysEndingToday("2026-08-25", set)).toBe(3);
  });
  it("is 1 for a lone perfect day even with nothing persisted yet", () => {
    expect(consecutiveDaysEndingToday("2026-08-25", new Set())).toBe(1);
  });
});

describe("buildRoundupText", () => {
  it("stacks header, summary, a line per game, and the link with no blank lines", () => {
    const text = buildRoundupText("2026-08-25", [polygram, pierglass], 4);
    expect(text).toBe(
      [
        "WordGirl — August 25",
        "✅ 2/2 · ⏱️ 5:31 · 🔥 4",
        "🔻 Polygram · 42 words · ⏱️ 3:21 · 🤓 0",
        "🪞 Pierglass · 6 rows · ⏱️ 2:10 · 🫣 2",
        SHARE_URL,
      ].join("\n"),
    );
    expect(text).not.toContain("\n\n");
  });
  it("drops the streak flame at a one-day streak", () => {
    const text = buildRoundupText("2026-08-25", [polygram, pierglass], 1);
    expect(text.split("\n")[1]).toBe("✅ 2/2 · ⏱️ 5:31");
  });
});
