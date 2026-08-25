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
  it("is emoji · name · metric · time, no hint tail on a hint-free day", () => {
    expect(roundupShareLine(polygram, false)).toBe(
      "🔻 Polygram · 42 words · ⏱️ 3:21",
    );
    expect(roundupShareLine(pierglass, false)).toBe(
      "🪞 Pierglass · 6 rows · ⏱️ 2:10",
    );
  });
  it("trails each line with the game's hint glyph once the day used any", () => {
    // Clean game shows 🤓 0 so it reads apart from the ones that used hints.
    expect(roundupShareLine(polygram, true)).toBe(
      "🔻 Polygram · 42 words · ⏱️ 3:21 · 🤓 0",
    );
    expect(roundupShareLine(pierglass, true)).toBe(
      "🪞 Pierglass · 6 rows · ⏱️ 2:10 · 🫣 2",
    );
  });
  it("passes a multi-level metric straight through, hint glyph last", () => {
    const crosshatch: RoundupEntry = {
      emoji: "🧺", name: "Crosshatch", metric: "Normal 12 · Hard 13",
      elapsedMs: 9 * 60_000, hints: 1,
    };
    expect(roundupShareLine(crosshatch, true)).toBe(
      "🧺 Crosshatch · Normal 12 · Hard 13 · ⏱️ 9:00 · 🫣 1",
    );
  });
});

describe("roundupDetail", () => {
  it("is metric · time (no emoji, no name), no hint tail on a hint-free day", () => {
    const detail = roundupDetail(polygram, false);
    expect(detail).toBe("42 words · 3:21");
    expect(detail).not.toContain("🔻");
    expect(detail).not.toContain("Polygram");
    expect(detail).not.toContain("hint");
  });
  it("shows the game's labelled count once the day used any hints — 0 included", () => {
    // A clean game still shows "0 hints" so it reads apart from the users.
    expect(roundupDetail(polygram, true)).toBe("42 words · 3:21 · 0 hints");
    expect(roundupDetail(pierglass, true)).toBe("6 rows · 2:10 · 2 hints");
    expect(roundupDetail({ ...pierglass, hints: 1 }, true)).toBe(
      "6 rows · 2:10 · 1 hint",
    );
  });
});

describe("multi-level details", () => {
  const crosshatch: RoundupEntry = {
    emoji: "🧺",
    name: "Crosshatch",
    unit: "words",
    elapsedMs: 9 * 60_000,
    hints: 4,
    levels: [
      { label: "Normal", value: 12, elapsedMs: 4 * 60_000, hints: 1 },
      { label: "Hard", value: 13, elapsedMs: 5 * 60_000, hints: 3 },
    ],
  };
  it("header shows the combined count, the game's time, and its labelled hint total", () => {
    expect(roundupAggregateDetail(crosshatch, true)).toBe(
      "25 words · 9:00 · 4 hints",
    );
  });
  it("each sub-row is a bare count · time · bare hint (unit and label live on the header)", () => {
    expect(roundupLevelDetail(crosshatch.levels![0], true)).toBe("12 · 4:00 · 1");
    expect(roundupLevelDetail(crosshatch.levels![1], true)).toBe("13 · 5:00 · 3");
  });
  it("omits every hint tail on a hint-free day (show=false)", () => {
    expect(roundupAggregateDetail(crosshatch, false)).toBe("25 words · 9:00");
    expect(roundupLevelDetail(crosshatch.levels![0], false)).toBe("12 · 4:00");
  });
  it("still shares as one inline line, hint glyph last", () => {
    expect(roundupShareLine(crosshatch, true)).toBe(
      "🧺 Crosshatch · Normal 12 · Hard 13 · ⏱️ 9:00 · 🫣 4",
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
  it("stacks header, summary, a hint-tailed line per game, and the link with no blank lines", () => {
    // Day used hints (0 + 2 = 2), so every game line trails its glyph — the
    // clean game as 🤓 0 — and the summary keeps the total.
    const text = buildRoundupText("2026-08-25", [polygram, pierglass], 4);
    expect(text).toBe(
      [
        "WordGirl — August 25",
        "✅ 2/2 · ⏱️ 5:31 · 🫣 2 · 🔥 4",
        "🔻 Polygram · 42 words · ⏱️ 3:21 · 🤓 0",
        "🪞 Pierglass · 6 rows · ⏱️ 2:10 · 🫣 2",
        SHARE_URL,
      ].join("\n"),
    );
    expect(text).not.toContain("\n\n");
  });
  it("leaves the game lines bare on a hint-free day; only the summary's 🤓 0 shows", () => {
    const clean = { ...pierglass, hints: 0 };
    const text = buildRoundupText("2026-08-25", [polygram, clean], 1);
    expect(text).toBe(
      [
        "WordGirl — August 25",
        "✅ 2/2 · ⏱️ 5:31 · 🤓 0",
        "🔻 Polygram · 42 words · ⏱️ 3:21",
        "🪞 Pierglass · 6 rows · ⏱️ 2:10",
        SHARE_URL,
      ].join("\n"),
    );
  });
  it("drops the streak flame at a one-day streak but keeps the hint total", () => {
    const text = buildRoundupText("2026-08-25", [polygram, pierglass], 1);
    expect(text.split("\n")[1]).toBe("✅ 2/2 · ⏱️ 5:31 · 🫣 2");
  });
});
