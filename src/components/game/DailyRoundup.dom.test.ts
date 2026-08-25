import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DailyRoundup } from "./DailyRoundup";
import type { RoundupEntry } from "../../lib/roundup";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

/**
 * The registry is the only input to the roundup: each game contributes an
 * entry (or null), plus the dates it was fully solved (for the streak).
 * Mocking it drives the gate and the streak without five games'
 * persistence. `state` is hoisted so the mock factory and each test share
 * one mutable cell.
 */
const state = vi.hoisted(() => ({
  a: null as RoundupEntry | null,
  b: null as RoundupEntry | null,
  cHasLoader: true,
  c: null as RoundupEntry | null,
  dates: { a: [] as string[], b: [] as string[], c: [] as string[] },
}));

vi.mock("../../games/registry", () => ({
  games: [
    {
      id: "a",
      name: "Alpha",
      roundupEntry: async () => state.a,
      solvedDates: async () => state.dates.a,
    },
    {
      id: "b",
      name: "Bravo",
      roundupEntry: async () => state.b,
      solvedDates: async () => state.dates.b,
    },
    {
      id: "c",
      name: "Charlie",
      get roundupEntry() {
        return state.cHasLoader ? async () => state.c : undefined;
      },
      solvedDates: async () => state.dates.c,
    },
  ],
}));

let container: HTMLDivElement;
let root: Root;
let copied: string[];

async function flush(ticks = 8) {
  for (let i = 0; i < ticks; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
  act(() => {
    root.render(createElement(DailyRoundup, { today: "2026-08-25" }));
  });
  await flush();
}

beforeEach(() => {
  copied = [];
  state.a = { emoji: "🔺", name: "Alpha", metric: "5 words", elapsedMs: 61_000, hints: 0 };
  state.b = { emoji: "🟦", name: "Bravo", metric: "3 rows", elapsedMs: 130_000, hints: 2 };
  state.c = { emoji: "🟩", name: "Charlie", metric: "8 letters", elapsedMs: 90_000, hints: 0 };
  state.cHasLoader = true;
  state.dates = { a: ["2026-08-25"], b: ["2026-08-25"], c: ["2026-08-25"] };
  Object.assign(navigator, {
    clipboard: { writeText: async (t: string) => void copied.push(t) },
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("DailyRoundup", () => {
  it("stays hidden while a game with a loader isn't finished", async () => {
    state.b = null;
    await mount();
    expect(container.textContent).toBe("");
  });

  it("stays hidden when a game has no loader (can't prove a full day)", async () => {
    state.cHasLoader = false;
    await mount();
    expect(container.textContent).toBe("");
  });

  it("lists each game (stat · time · hints), no emoji in the rows", async () => {
    await mount();
    expect(container.textContent).toContain("Every puzzle done today");
    expect(container.textContent).toContain("3/3 solved · 4:41");
    expect(container.textContent).toContain("Alpha");
    expect(container.textContent).toContain("5 words · 1:01 · no hints");
    expect(container.textContent).toContain("Bravo");
    expect(container.textContent).toContain("3 rows · 2:10 · 2 hints");
    expect(container.textContent).toContain("Charlie");
    for (const glyph of ["🔺", "🟦", "🟩", "🫣", "🤓"]) {
      expect(container.textContent).not.toContain(glyph);
    }
  });

  it("wraps the card in the rainbow gradient border", async () => {
    await mount();
    const section = container.querySelector<HTMLElement>(
      '[aria-label="Today\'s roundup"]',
    )!;
    expect(section.style.background).toContain("--roundup-rainbow");
  });

  it("shares the whole day: header, summary, an emoji+hint line per game", async () => {
    // Give a two-day all-games streak: yesterday complete for every game.
    state.dates = {
      a: ["2026-08-25", "2026-08-24"],
      b: ["2026-08-25", "2026-08-24"],
      c: ["2026-08-25", "2026-08-24"],
    };
    await mount();
    // Streak shows in the card summary too.
    expect(container.textContent).toContain("2-day streak");
    const button = [...container.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Share",
    )!;
    await act(async () => {
      button.click();
    });
    await flush();
    expect(copied).toHaveLength(1);
    expect(copied[0]).toBe(
      [
        "WordGirl — August 25",
        "✅ 3/3 · ⏱️ 4:41 · 🔥 2",
        "🔺 Alpha · 5 words · ⏱️ 1:01 · 🤓 0",
        "🟦 Bravo · 3 rows · ⏱️ 2:10 · 🫣 2",
        "🟩 Charlie · 8 letters · ⏱️ 1:30 · 🤓 0",
        "wordgirl.net",
      ].join("\n"),
    );
  });
});
