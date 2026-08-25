import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { DailyOutro } from "./DailyOutro";
import type { RoundupEntry } from "../../lib/roundup";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// The outro reads the registry (which games are done) and the live date.
const state = vi.hoisted(() => ({
  bDone: true,
  entries: {
    a: { emoji: "🔺", name: "Alpha", metric: "5 words", elapsedMs: 61_000 },
    b: { emoji: "🟦", name: "Bravo", metric: "3 rows", elapsedMs: 130_000 },
  } as Record<string, RoundupEntry | null>,
}));

vi.mock("../../games/registry", () => ({
  games: [
    {
      id: "a",
      name: "Alpha",
      solvedToday: async () => true,
      roundupEntry: async () => state.entries.a,
    },
    {
      id: "b",
      name: "Bravo",
      solvedToday: async () => state.bDone,
      roundupEntry: async () => (state.bDone ? state.entries.b : null),
    },
  ],
}));

vi.mock("../../lib/useToday", () => ({ useToday: () => "2026-08-25" }));

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
    // gameId "a" is the game just finished; the outro looks at the others.
    root.render(
      createElement(
        MemoryRouter,
        null,
        createElement(DailyOutro, { gameId: "a", loadStreak: async () => 3 }),
      ),
    );
  });
  await flush();
}

beforeEach(() => {
  copied = [];
  state.bDone = true;
  Object.assign(navigator, {
    clipboard: { writeText: async (t: string) => void copied.push(t) },
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("DailyOutro when the day is complete", () => {
  it("announces it and offers a single share of the whole day", async () => {
    await mount();
    expect(container.textContent).toContain("Every puzzle done today");
    const share = [...container.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Share",
    );
    expect(share).toBeTruthy();
    await act(async () => {
      share!.click();
    });
    await flush();
    expect(copied[0]).toBe(
      [
        "WordGirl — August 25",
        "🔺 Alpha · 5 words · ⏱️ 1:01",
        "🟦 Bravo · 3 rows · ⏱️ 2:10",
        "wordgirl.net",
      ].join("\n"),
    );
  });
});

describe("DailyOutro with puzzles still open", () => {
  it("lists what's left and offers no day-share yet", async () => {
    state.bDone = false;
    await mount();
    expect(container.textContent).toContain("Still open today");
    expect(container.textContent).toContain("Bravo");
    expect(container.textContent).not.toContain("Every puzzle done today");
    const share = [...container.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Share",
    );
    expect(share).toBeFalsy();
  });
});
