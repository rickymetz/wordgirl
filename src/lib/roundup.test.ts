import { describe, expect, it } from "vitest";
import {
  buildRoundupText,
  roundupAggregateDetail,
  roundupDetail,
  roundupLevelDetail,
  roundupShareLine,
  roundupSummary,
  roundupTotalMs,
  streakEndingToday,
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
  it("is emoji · name · metric · time — hints ride the day total, not each line", () => {
    expect(roundupShareLine(polygram)).toBe("🔻 Polygram · 42 words · ⏱️ 3:21");
    expect(roundupShareLine(pierglass)).toBe("🪞 Pierglass · 6 rows · ⏱️ 2:10");
  });
  it("passes a multi-level metric straight through", () => {
    const crosshatch: RoundupEntry = {
      emoji: "🧺", name: "Crosshatch", metric: "Normal 12 · Hard 13",
      elapsedMs: 9 * 60_000, hints: 1,
    };
    expect(roundupShareLine(crosshatch)).toBe(
      "🧺 Crosshatch · Normal 12 · Hard 13 · ⏱️ 9:00",
    );
  });
});

describe("roundupDetail", () => {
  it("is metric · time only (no emoji, no name, no per-game hints)", () => {
    const detail = roundupDetail(polygram);
    expect(detail).toBe("42 words · 3:21");
    expect(detail).not.toContain("🔻");
    expect(detail).not.toContain("Polygram");
    expect(detail).not.toContain("hint");
  });
});

describe("multi-level details", () => {
  const crosshatch: RoundupEntry = {
    emoji: "🧺",
    name: "Crosshatch",
    unit: "words",
    elapsedMs: 9 * 60_000,
    hints: 0,
    levels: [
      { label: "Normal", value: 12, elapsedMs: 4 * 60_000 },
      { label: "Hard", value: 13, elapsedMs: 5 * 60_000 },
    ],
  };
  it("header shows the combined count and the whole game's time", () => {
    expect(roundupAggregateDetail(crosshatch)).toBe("25 words · 9:00");
  });
  it("each sub-row shows its own count (with unit) and time", () => {
    expect(roundupLevelDetail("words", crosshatch.levels![0])).toBe(
      "12 words · 4:00",
    );
    expect(roundupLevelDetail("words", crosshatch.levels![1])).toBe(
      "13 words · 5:00",
    );
  });
  it("still shares as one inline line", () => {
    expect(roundupShareLine(crosshatch)).toBe(
      "🧺 Crosshatch · Normal 12 · Hard 13 · ⏱️ 9:00",
    );
  });
});

describe("roundupTotalMs / roundupSummary", () => {
  it("sums play time across games", () => {
    expect(roundupTotalMs([polygram, pierglass])).toBe(331_000);
  });
  it("leads with the streak only past day one, then total time and hints", () => {
    // polygram 0 hints + pierglass 2 hints = 2.
    expect(roundupSummary([polygram, pierglass], 1)).toBe(
      "Total time 5:31 · 2 Hints",
    );
    expect(roundupSummary([polygram, pierglass], 4)).toBe(
      "4 day streak · Total time 5:31 · 2 Hints",
    );
  });
  it("singularises a lone hint", () => {
    expect(roundupSummary([polygram, { ...pierglass, hints: 1 }], 1)).toBe(
      "Total time 5:31 · 1 Hint",
    );
  });
});

describe("streakEndingToday", () => {
  const on = (dates: string[]) => async (d: string) => dates.includes(d);

  it("counts today plus each unbroken prior complete day, stopping at the gap", async () => {
    // today (unconditional) + 24 + 23, then 22 is missing -> stops.
    const probe = on(["2026-08-24", "2026-08-23", "2026-08-21"]);
    await expect(streakEndingToday("2026-08-25", probe)).resolves.toBe(3);
  });

  it("is 1 for a lone perfect day even when nothing earlier is complete", async () => {
    await expect(streakEndingToday("2026-08-25", on([]))).resolves.toBe(1);
  });

  it("only probes the days the streak spans, never the whole history", async () => {
    const probed: string[] = [];
    const probe = async (d: string) => {
      probed.push(d);
      return d === "2026-08-24"; // only yesterday complete
    };
    const streak = await streakEndingToday("2026-08-25", probe);
    expect(streak).toBe(2);
    // Probed 24 (hit) and 23 (miss -> stop). Never walked further back.
    expect(probed).toEqual(["2026-08-24", "2026-08-23"]);
  });
});

describe("buildRoundupText", () => {
  it("stacks header, summary, a line per game, and the link with no blank lines", () => {
    // Total hints on the summary line (0 + 2 = 2); per-game lines carry
    // metric + time only.
    const text = buildRoundupText("2026-08-25", [polygram, pierglass], 4);
    expect(text).toBe(
      [
        "WordGirl — August 25",
        "✅ 2/2 · ⏱️ 5:31 · 🫣 2 · 🔥 4",
        "🔻 Polygram · 42 words · ⏱️ 3:21",
        "🪞 Pierglass · 6 rows · ⏱️ 2:10",
        SHARE_URL,
      ].join("\n"),
    );
    expect(text).not.toContain("\n\n");
  });
  it("drops the streak flame at a one-day streak but keeps the hint total", () => {
    const text = buildRoundupText("2026-08-25", [polygram, pierglass], 1);
    expect(text.split("\n")[1]).toBe("✅ 2/2 · ⏱️ 5:31 · 🫣 2");
  });
});
