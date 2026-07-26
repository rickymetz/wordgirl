import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DominoTray } from "./DominoTray";
import { initialState } from "../state/reducer";
import { TUTORIAL_PUZZLE } from "../engine/tutorial";

// Opt this file into React's act() environment — without it every render
// logs "not configured to support act(...)".
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

/** jsdom has no PointerEvent; the chip reads only coords + pointerId. */
function pointer(
  el: Element,
  type: string,
  { x = 0, y = 0 }: { x?: number; y?: number } = {},
) {
  act(() => {
    el.dispatchEvent(
      new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }),
    );
  });
}

interface Calls {
  dragStarts: number;
  dragEnds: number;
  selects: number;
  rotates: number;
}

function render(): { chip: Element; calls: Calls } {
  const calls: Calls = { dragStarts: 0, dragEnds: 0, selects: 0, rotates: 0 };
  const state = initialState(TUTORIAL_PUZZLE);
  act(() => {
    root.render(
      createElement(DominoTray, {
        state,
        onSelect: () => calls.selects++,
        onRotate: () => calls.rotates++,
        onDragStart: () => calls.dragStarts++,
        onDragMove: () => {},
        onDragEnd: () => calls.dragEnds++,
        draggedId: null,
      }),
    );
  });
  const chip = container.querySelector("button[aria-label^='Domino']")!;
  // jsdom stubs neither of these; the chip calls both on a real pointer.
  (chip as HTMLElement).setPointerCapture = () => {};
  (chip as HTMLElement).releasePointerCapture = () => {};
  return { chip, calls };
}

describe("a tray domino", () => {
  it("does NOT start a drag on plain mouse hover", () => {
    // Regression: pointermove also fires for a MOUSE moving across the
    // tray with no button held. The threshold test measured from an unset
    // origin of (0,0), so any hover far from the top-left corner cleared
    // it and started a phantom drag — whose ghost never disappeared,
    // because no pointerup was coming. Touch sends no hover events, so
    // this only ever bit desktop.
    const { chip, calls } = render();
    pointer(chip, "pointermove", { x: 195, y: 780 });
    pointer(chip, "pointermove", { x: 200, y: 790 });
    expect(calls.dragStarts).toBe(0);
    expect(calls.dragEnds).toBe(0);
  });

  it("selects on a tap, without starting a drag", () => {
    const { chip, calls } = render();
    pointer(chip, "pointerdown", { x: 100, y: 100 });
    pointer(chip, "pointerup", { x: 100, y: 100 });
    expect(calls.selects).toBe(1);
    expect(calls.dragStarts).toBe(0);
  });

  it("tolerates a jitter smaller than the drag threshold", () => {
    const { chip, calls } = render();
    pointer(chip, "pointerdown", { x: 100, y: 100 });
    pointer(chip, "pointermove", { x: 103, y: 102 }); // < 8px
    pointer(chip, "pointerup", { x: 103, y: 102 });
    expect(calls.dragStarts).toBe(0);
    expect(calls.selects).toBe(1);
  });

  it("starts and ends a drag once the pointer travels far enough", () => {
    const { chip, calls } = render();
    pointer(chip, "pointerdown", { x: 100, y: 100 });
    pointer(chip, "pointermove", { x: 160, y: 160 });
    expect(calls.dragStarts).toBe(1);
    pointer(chip, "pointerup", { x: 160, y: 160 });
    expect(calls.dragEnds).toBe(1);
    // A drag is not also a tap.
    expect(calls.selects).toBe(0);
  });

  it("stops tracking after the pointer is released", () => {
    const { chip, calls } = render();
    pointer(chip, "pointerdown", { x: 100, y: 100 });
    pointer(chip, "pointerup", { x: 100, y: 100 });
    // Cursor drifts on across the tray — no button held, so nothing starts.
    pointer(chip, "pointermove", { x: 300, y: 400 });
    expect(calls.dragStarts).toBe(0);
  });
});
