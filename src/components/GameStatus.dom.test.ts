import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement, useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { GameStatus } from "./GameStatus";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// useToday is the live local date; drive it by hand so the test can cross
// midnight without waiting for one.
const clock = vi.hoisted(() => ({ today: "2026-08-25", notify: () => {} }));
vi.mock("../lib/useToday", () => ({
  useToday: () =>
    useSyncExternalStore(
      (onChange: () => void) => {
        clock.notify = onChange;
        return () => {};
      },
      () => clock.today,
    ),
}));

let container: HTMLDivElement;
let root: Root;

async function flush() {
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

beforeEach(async () => {
  clock.today = "2026-08-25";
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
  act(() => {
    root.render(
      createElement(GameStatus, {
        loadState: async (d: string) => `state ${d}`,
        loadStreak: async () => 1,
      }),
    );
  });
  await flush();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("GameStatus", () => {
  it("shows today's date and the game's play state", async () => {
    expect(container.textContent).toContain("Tuesday, August 25");
    expect(container.textContent).toContain("state 2026-08-25");
  });

  it("re-renders the DATE at midnight rollover, not just the play state", async () => {
    // The date is measured-and-fitted rather than rendered straight from
    // `today`, so a rollover has to re-run that measurement — otherwise the
    // card sits on yesterday's date while the line below it updates.
    act(() => {
      clock.today = "2026-08-26";
      clock.notify();
    });
    await flush();
    expect(container.textContent).toContain("Wednesday, August 26");
    expect(container.textContent).not.toContain("August 25");
    expect(container.textContent).toContain("state 2026-08-26");
  });
});
