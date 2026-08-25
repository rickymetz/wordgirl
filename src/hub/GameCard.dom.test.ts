import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { GameCard } from "./GameCard";
import type { GameDefinition } from "../games/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const game = {
  id: "demo",
  name: "Demo",
  tagline: "A tagline.",
  accentLevel: "demo",
  Preview: () => createElement("div", { "data-testid": "preview" }),
  secondaryActions: [
    { label: "Practice", path: "practice" },
    { label: "Archive", path: "archive" },
    { label: "Stats", path: "stats" },
    { label: "Tutorial", path: "tutorial" },
  ],
} as unknown as GameDefinition;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
  act(() => {
    root.render(
      createElement(MemoryRouter, null, createElement(GameCard, { game })),
    );
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("GameCard secondary-action scroller", () => {
  it("renders every action as a routed button inside the scroller", () => {
    const scroller = container.querySelector(".card-action-scroller")!;
    expect(scroller).toBeTruthy();
    // data-fade is always present so the CSS mask has something to key on.
    expect(scroller.getAttribute("data-fade")).toBeTruthy();

    const links = [...scroller.querySelectorAll("a")];
    expect(links.map((a) => a.textContent?.trim())).toEqual([
      "Practice",
      "Archive",
      "Stats",
      "Tutorial",
    ]);
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/games/demo/practice",
      "/games/demo/archive",
      "/games/demo/stats",
      "/games/demo/tutorial",
    ]);
    // All buttons share the fixed width and snap to the row start.
    for (const a of links) {
      expect(a.className).toContain("w-[37%]");
      expect(a.className).toContain("snap-start");
    }
  });

  it("puts the actions UNDER the primary card, not inside its link", () => {
    const primary = container.querySelector<HTMLAnchorElement>('a[href="/games/demo"]')!;
    expect(primary).toBeTruthy();
    // The scroller is a sibling after the primary link, never nested in it.
    expect(primary.querySelector(".card-action-scroller")).toBeNull();
    const section = container.querySelector("section")!;
    expect(section.querySelector(".card-action-scroller")).toBeTruthy();
  });
});
