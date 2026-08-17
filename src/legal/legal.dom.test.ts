import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { PrivacyPage } from "./PrivacyPage";
import { TermsPage } from "./TermsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(Page: () => ReactElement) {
  act(() => {
    root.render(createElement(MemoryRouter, null, createElement(Page)));
  });
}

describe.each([
  { name: "Privacy", Page: PrivacyPage, title: "Privacy" },
  { name: "Terms", Page: TermsPage, title: "Terms" },
])("$name page", ({ Page, title }) => {
  it("renders one h1 carrying the page title", () => {
    render(Page);
    const h1s = container.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe(title);
  });

  it("keeps every section under the h1, so the outline is walkable", () => {
    render(Page);
    // A screen reader's heading list is the only navigation these pages
    // have; an h2 that drifted to h3 would break the outline silently.
    const levels = [...container.querySelectorAll("h1, h2, h3")].map(
      (h) => h.tagName,
    );
    expect(levels[0]).toBe("H1");
    expect(new Set(levels.slice(1))).toEqual(new Set(["H2"]));
  });

  it("offers a way home", () => {
    render(Page);
    const home = container.querySelector('a[aria-label="WordGirl home"]');
    expect(home?.getAttribute("href")).toBe("/");
  });

  it("opens the contact link safely in a new tab", () => {
    render(Page);
    const link = [...container.querySelectorAll("a")].find((a) =>
      a.href.includes("github.com"),
    );
    expect(link).toBeDefined();
    // target=_blank without noreferrer hands the opener to the new tab.
    expect(link!.rel).toContain("noreferrer");
  });

  it("dates itself, so a stale policy is visible", () => {
    render(Page);
    expect(container.textContent).toMatch(/Last updated \w+ \d{4}\./);
  });
});
