import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SnakeGrid } from "./SnakeGrid";
import { TUTORIAL_PUZZLE } from "../engine/tutorial";
import { cellKey, type Cell } from "../engine/types";

// Opt this file into React's act() environment — without it every render
// logs "not configured to support act(...)".
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root;

/**
 * jsdom does not implement `:focus-visible`, so `matches()` cannot answer
 * the one question the cursor gate asks. Stand in for it: the test says
 * whether this focus is keyboard-driven, which is exactly what a browser
 * decides for us in production.
 */
const realMatches = Element.prototype.matches;
let keyboardFocus = false;

beforeEach(() => {
  keyboardFocus = false;
  Element.prototype.matches = function (selector: string) {
    if (selector === ":focus-visible") return keyboardFocus;
    return realMatches.call(this, selector);
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
});

afterEach(() => {
  Element.prototype.matches = realMatches;
  act(() => root.unmount());
  container.remove();
});

const p = TUTORIAL_PUZZLE;

function render(cells: Cell[]) {
  act(() => {
    root.render(
      createElement(SnakeGrid, {
        rows: p.rows,
        cols: p.cols,
        grid: p.grid,
        cells,
        claimed: new Set(cells.map(cellKey)),
        solved: false,
        blocked: p.blocked,
        onTapCell: () => {},
      }),
    );
  });
}

const grid = () => container.querySelector<HTMLElement>('[role="grid"]')!;
/** The cell wearing the keyboard cursor, or null when none is shown. */
const cursor = () => {
  const el = grid().querySelector(".ring-2");
  return el ? el.textContent : null;
};

describe("SnakeGrid's keyboard cursor", () => {
  it("stays hidden when focus did not come from the keyboard", () => {
    // The reported bug: a phone player, who has only ever tapped, saw the
    // top-left letter ringed. Focus reaches the board by more routes than a
    // Tab — useModalFocus hands it back when a sheet closes, a resumed tab
    // restores it — and none of them should raise a cursor.
    render(p.path.slice(0, 3));
    act(() => grid().focus());
    expect(cursor()).toBeNull();
  });

  it("appears on a keyboard focus, on the line's head", () => {
    render(p.path.slice(0, 3));
    keyboardFocus = true;
    act(() => grid().focus());
    // path[2] is (1,0) — an A. Never the top-left corner, which is a T.
    expect(cursor()).toBe(p.grid[p.path[2].row][p.path[2].col]);
    expect(cursor()).not.toBe(p.grid[0][0]);
  });

  it("follows the head as the line grows", () => {
    render(p.path.slice(0, 3));
    render(p.path.slice(0, 5));
    keyboardFocus = true;
    act(() => grid().focus());
    expect(cursor()).toBe(p.grid[p.path[4].row][p.path[4].col]);
  });

  it("starts on the given letter before a move is made", () => {
    render(p.path.slice(0, 1));
    keyboardFocus = true;
    act(() => grid().focus());
    expect(cursor()).toBe(p.grid[p.path[0].row][p.path[0].col]);
  });

  it("still raises on an arrow key, whatever brought focus in", () => {
    // A player who taps and then reaches for the arrows IS a keyboard
    // player from that moment, even though the focus itself was a tap.
    render(p.path.slice(0, 3));
    act(() => grid().focus());
    expect(cursor()).toBeNull();
    act(() => {
      grid().dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });
    expect(cursor()).not.toBeNull();
  });

  it("puts the cursor away on blur", () => {
    render(p.path.slice(0, 3));
    keyboardFocus = true;
    act(() => grid().focus());
    expect(cursor()).not.toBeNull();
    act(() => grid().blur());
    expect(cursor()).toBeNull();
  });
});
