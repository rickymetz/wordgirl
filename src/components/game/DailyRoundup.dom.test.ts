import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DailyRoundup } from "./DailyRoundup";
import type { RoundupEntry } from "../../lib/roundup";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

/**
 * The registry is the only input to the roundup: each game contributes an
 * entry or a null. Mocking it lets us drive the gate (all-or-nothing) and
 * the rendering without standing up five games' persistence — that per-game
 * wiring is exercised where those loaders live. `state` is hoisted so the
 * mock factory and each test read the same mutable cell.
 */
const state = vi.hoisted(() => ({
  a: null as RoundupEntry | null,
  b: null as RoundupEntry | null,
  /** Whether game "c" even has a loader — the missing-loader branch. */
  cHasLoader: true,
  c: null as RoundupEntry | null,
}));

vi.mock("../../games/registry", () => ({
  games: [
    { id: "a", name: "Alpha", roundupEntry: async () => state.a },
    { id: "b", name: "Bravo", roundupEntry: async () => state.b },
    {
      id: "c",
      name: "Charlie",
      // A game may ship without a loader; the roundup must not appear then.
      get roundupEntry() {
        return state.cHasLoader ? async () => state.c : undefined;
      },
    },
  ],
}));

let container: HTMLDivElement;
let root: Root;
let copied: string[];

async function flush(ticks = 6) {
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
  state.a = { emoji: "🔺", name: "Alpha", metric: "5 words", elapsedMs: 61_000 };
  state.b = { emoji: "🟦", name: "Bravo", metric: "3 rows", elapsedMs: 130_000 };
  state.c = { emoji: "🟩", name: "Charlie", metric: "8 letters", elapsedMs: 90_000 };
  state.cHasLoader = true;
  // navigator.share is absent in jsdom, so the button falls to clipboard.
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

  it("lists each finished game with no emoji in the visible rows", async () => {
    await mount();
    expect(container.textContent).toContain("Today's roundup");
    expect(container.textContent).toContain("Alpha");
    expect(container.textContent).toContain("5 words · 1:01");
    expect(container.textContent).toContain("Bravo");
    expect(container.textContent).toContain("3 rows · 2:10");
    expect(container.textContent).toContain("Charlie");
    expect(container.textContent).toContain("8 letters · 1:30");
    // Emoji ride the share string only — never the UI.
    expect(container.textContent).not.toContain("🔺");
    expect(container.textContent).not.toContain("🟦");
    expect(container.textContent).not.toContain("🟩");
  });

  it("shares the whole day: dated header, an emoji line per game, the link", async () => {
    await mount();
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
        "🔺 Alpha · 5 words · ⏱️ 1:01",
        "🟦 Bravo · 3 rows · ⏱️ 2:10",
        "🟩 Charlie · 8 letters · ⏱️ 1:30",
        "wordgirl.net",
      ].join("\n"),
    );
  });
});
