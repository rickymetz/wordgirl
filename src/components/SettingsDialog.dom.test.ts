import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SettingsDialog } from "./SettingsDialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root;
let sent: string[];

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.font;
  sent = [];
  window.fathom = { trackEvent: (name: string) => sent.push(name) };
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
  act(() => {
    root.render(createElement(SettingsDialog, { onClose: () => {} }));
  });
});

afterEach(() => {
  delete window.fathom;
  act(() => root.unmount());
  container.remove();
});

/** A radio in a named group — "Default" labels one in two of them. */
function pick(group: string, label: string) {
  const groups = [...container.querySelectorAll('[role="radiogroup"]')];
  const target = groups.find((g) => g.getAttribute("aria-label") === group)!;
  const radio = [...target.querySelectorAll<HTMLElement>('[role="radio"]')].find(
    (r) => r.getAttribute("aria-label") === label,
  )!;
  act(() => {
    radio.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("settings report what the player changed", () => {
  it("sends one app-level event per change, with no game prefix", () => {
    pick("Font", "Accessible");
    pick("Theme", "Dark");
    pick("Text size", "Huge");
    expect(sent).toEqual([
      "setting:font:accessible",
      "setting:theme:dark",
      "setting:text:huge",
    ]);
  });

  it("sends the text size as a label, not the percentage", () => {
    pick("Text size", "Large");
    expect(sent).toEqual(["setting:text:large"]);
  });

  it("says nothing when a tap re-picks the value already showing", () => {
    // Every radio stays tappable, including the checked one. Re-picking is
    // not a decision, and counting it would inflate whichever setting
    // happens to be the default.
    pick("Theme", "System");
    pick("Font", "Default");
    expect(sent).toEqual([]);
  });

  it("reports only the setting that moved", () => {
    pick("Font", "Accessible");
    sent.length = 0;
    pick("Theme", "Light");
    expect(sent).toEqual(["setting:theme:light"]);
  });
});
