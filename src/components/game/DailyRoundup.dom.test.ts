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
      solvedOn: async (d: string) => state.dates.a.includes(d),
    },
    {
      id: "b",
      name: "Bravo",
      roundupEntry: async () => state.b,
      solvedOn: async (d: string) => state.dates.b.includes(d),
    },
    {
      id: "c",
      name: "Charlie",
      get roundupEntry() {
        return state.cHasLoader ? async () => state.c : undefined;
      },
      solvedOn: async (d: string) => state.dates.c.includes(d),
    },
  ],
}));

let container: HTMLDivElement;
let root: Root;
let copied: string[];
let tracked: string[];

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
  tracked = [];
  window.fathom = { trackEvent: (name: string) => void tracked.push(name) };
  localStorage.clear(); // per-day celebrate/dismiss flags
  state.a = { emoji: "🔺", name: "Alpha", unit: "words", value: 5, elapsedMs: 61_000, hints: 0 };
  state.b = { emoji: "🟦", name: "Bravo", unit: "rows", value: 3, elapsedMs: 130_000, hints: 2 };
  state.c = { emoji: "🟩", name: "Charlie", unit: "letters", value: 8, elapsedMs: 90_000, hints: 0 };
  state.cHasLoader = true;
  state.dates = { a: ["2026-08-25"], b: ["2026-08-25"], c: ["2026-08-25"] };
  Object.assign(navigator, {
    clipboard: { writeText: async (t: string) => void copied.push(t) },
  });
  // ConfettiOverlay reads matchMedia; jsdom doesn't provide it.
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
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

  it("lists each game (metric · time · labelled hints) once the day used any, no emoji", async () => {
    // Bravo used 2 hints, so the day is "some hints used": every game row
    // shows a labelled count, INCLUDING the clean games' "0 hints".
    await mount();
    expect(container.textContent).toContain("All Puzzles Solved Today");
    // Subtitle still carries the day totals: total time and total hints.
    expect(container.textContent).toContain("Total time 4:41 · 2 Hints");
    expect(container.textContent).toContain("Alpha");
    expect(container.textContent).toContain("5 words · 1:01 · 0 hints");
    expect(container.textContent).toContain("Bravo");
    expect(container.textContent).toContain("3 rows · 2:10 · 2 hints");
    expect(container.textContent).toContain("Charlie");
    // Emoji never leak into the visible card.
    for (const glyph of ["🔺", "🟦", "🟩", "🫣", "😎"]) {
      expect(container.textContent).not.toContain(glyph);
    }
  });

  it("keeps rows clean on a hint-free day — only the subtitle's 0 Hints", async () => {
    state.a = { ...state.a!, hints: 0 };
    state.b = { ...state.b!, hints: 0 };
    state.c = { ...state.c!, hints: 0 };
    await mount();
    expect(container.textContent).toContain("Total time 4:41 · 0 Hints");
    // No per-row hint counts anywhere.
    expect(container.textContent).toContain("5 words · 1:01");
    expect(container.textContent).not.toContain("0 hints");
    expect(container.textContent).not.toContain("1 hint");
  });

  it("wraps the card in the animated rainbow gradient border", async () => {
    await mount();
    const section = container.querySelector<HTMLElement>(
      '[aria-label="Today\'s roundup"]',
    )!;
    expect(section.className).toContain("roundup-rainbow-border");
  });

  it("shares the whole day: header, totals summary, a metric line per game", async () => {
    // Give a two-day all-games streak: yesterday complete for every game.
    state.dates = {
      a: ["2026-08-25", "2026-08-24"],
      b: ["2026-08-25", "2026-08-24"],
      c: ["2026-08-25", "2026-08-24"],
    };
    await mount();
    // Streak leads the card summary past day one.
    expect(container.textContent).toContain("2 day streak · Total time 4:41 · 2 Hints");
    const button = [...container.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Share",
    )!;
    await act(async () => {
      button.click();
    });
    await flush();
    expect(copied).toHaveLength(1);
    // The day-share is app-level, so it is counted under its own scope
    // rather than any one game's.
    expect(tracked).toEqual(["roundup:share"]);
    expect(copied[0]).toBe(
      [
        "WordGirl — August 25",
        "✅ 3/3 · ⏱️ 4:41 · 🫣 2 · 🔥 2",
        "🔺 Alpha 5 · 1:01 😎",
        "🟦 Bravo 3 · 2:10 🫣2",
        "🟩 Charlie 8 · 1:30 😎",
        "wordgirl.net",
      ].join("\n"),
    );
  });

  it("renders a multi-level game as a header total plus smaller sub-rows", async () => {
    state.c = {
      emoji: "🟩",
      name: "Charlie",
      unit: "words",
      elapsedMs: 9 * 60_000,
      hints: 4,
      levels: [
        { label: "Normal", value: 12, elapsedMs: 4 * 60_000, hints: 1 },
        { label: "Hard", value: 13, elapsedMs: 5 * 60_000, hints: 3 },
      ],
    };
    await mount();
    const txt = container.textContent!;
    expect(txt).toContain("Charlie");
    expect(txt).toContain("25 words · 9:00 · 4 hints"); // header: unit + labelled total
    expect(txt).toContain("Normal");
    expect(txt).toContain("12 · 4:00 · 1"); // sub-row: bare count · time · bare hint
    expect(txt).toContain("Hard");
    expect(txt).toContain("13 · 5:00 · 3");
    // The per-level list is the smaller text.
    const subList = container.querySelector(
      '[aria-label="Today\'s roundup"] ul ul',
    );
    expect(subList?.className).toContain("text-xs");
    expect(subList?.className).toContain("italic");
  });

  const banner = () =>
    container.querySelector('[aria-label="Today\'s roundup"]');

  it("fires the confetti once, then remembers it for the day", async () => {
    await mount();
    // ConfettiOverlay mounts its canvas on the first show.
    expect(container.querySelector("canvas")).toBeTruthy();
    expect(
      localStorage.getItem("wg:v1:local:roundup:celebrated:2026-08-25"),
    ).toBeTruthy();

    // A later visit the same day shows the banner but does NOT replay it.
    act(() => root.unmount());
    container.remove();
    await mount();
    expect(banner()).toBeTruthy();
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("can be dismissed for the day and stays gone", async () => {
    await mount();
    const dismiss = [...container.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Dismiss roundup",
    )!;
    await act(async () => {
      dismiss.click();
    });
    await flush();
    expect(banner()).toBeNull();
    expect(
      localStorage.getItem("wg:v1:local:roundup:dismissed:2026-08-25"),
    ).toBeTruthy();

    // Still gone on a fresh mount.
    act(() => root.unmount());
    container.remove();
    await mount();
    expect(banner()).toBeNull();
  });
});
