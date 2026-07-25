import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { HoldButton } from "./HoldButton";

// Opt this file into React's act() environment — without it every
// render logs "not configured to support act(...)".
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

/** Every dispatch flips component state, so all of them go through act. */
function fire(el: Element, event: Event) {
  act(() => {
    el.dispatchEvent(event);
  });
}
// jsdom has no PointerEvent; the component reads nothing off it beyond
// pointer capture, so a MouseEvent of the right type drives it fine.
function pointer(el: Element, type: string) {
  fire(el, new MouseEvent(type, { bubbles: true }));
}
function key(el: Element, type: "keydown" | "keyup", k: string, repeat = false) {
  fire(el, new KeyboardEvent(type, { key: k, repeat, bubbles: true }));
}
// React synthesizes onPointerLeave from pointerout + relatedTarget, and
// onBlur from focusout — dispatch what it actually listens for.
function leave(el: Element) {
  fire(
    el,
    new MouseEvent("pointerout", { bubbles: true, relatedTarget: document.body }),
  );
}
function blur(el: Element) {
  fire(el, new FocusEvent("focusout", { bubbles: true }));
}
type HoldButtonProps = Parameters<typeof HoldButton>[0];

let container: HTMLDivElement;
let root: Root;
let fired: number;

function render(props: Partial<HoldButtonProps> = {}) {
  act(() => {
    root.render(
      createElement(HoldButton, {
        onHoldComplete: () => fired++,
        holdMs: 1000,
        children: "Hold me",
        ...props,
      }),
    );
  });
  return container.querySelector("button")!;
}

beforeEach(() => {
  vi.useFakeTimers();
  fired = 0;
  container = document.createElement("div");
  document.body.append(container);
  act(() => {
    root = createRoot(container);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("HoldButton", () => {
  it("does not fire on a tap", () => {
    const button = render();
    pointer(button, "pointerdown");
    act(() => vi.advanceTimersByTime(120));
    pointer(button, "pointerup");
    act(() => vi.advanceTimersByTime(5000));
    expect(fired).toBe(0);
  });

  it("fires once the hold completes, and only once", () => {
    const button = render();
    pointer(button, "pointerdown");
    act(() => vi.advanceTimersByTime(999));
    expect(fired).toBe(0);
    act(() => vi.advanceTimersByTime(1));
    expect(fired).toBe(1);
    // Still holding after the fire — must not repeat.
    act(() => vi.advanceTimersByTime(5000));
    expect(fired).toBe(1);
  });

  it("aborts when the press drags off the button", () => {
    const button = render();
    pointer(button, "pointerdown");
    act(() => vi.advanceTimersByTime(900));
    leave(button);
    act(() => vi.advanceTimersByTime(5000));
    expect(fired).toBe(0);
  });

  it("aborts on pointercancel", () => {
    const button = render();
    pointer(button, "pointerdown");
    act(() => vi.advanceTimersByTime(900));
    pointer(button, "pointercancel");
    act(() => vi.advanceTimersByTime(5000));
    expect(fired).toBe(0);
  });

  it("restarts from zero after an aborted hold", () => {
    const button = render();
    pointer(button, "pointerdown");
    act(() => vi.advanceTimersByTime(900));
    pointer(button, "pointerup");
    pointer(button, "pointerdown");
    act(() => vi.advanceTimersByTime(900));
    expect(fired).toBe(0);
    act(() => vi.advanceTimersByTime(100));
    expect(fired).toBe(1);
  });

  it("holds with the keyboard, ignoring key repeat", () => {
    const button = render();
    key(button, "keydown", " ");
    act(() => vi.advanceTimersByTime(500));
    key(button, "keydown", " ", true); // repeat must not restart the timer
    act(() => vi.advanceTimersByTime(500));
    expect(fired).toBe(1);
  });

  it("aborts the keyboard hold on keyup and on blur", () => {
    const button = render();
    key(button, "keydown", "Enter");
    act(() => vi.advanceTimersByTime(500));
    key(button, "keyup", "Enter");
    act(() => vi.advanceTimersByTime(5000));
    expect(fired).toBe(0);

    key(button, "keydown", "Enter");
    act(() => vi.advanceTimersByTime(500));
    blur(button);
    act(() => vi.advanceTimersByTime(5000));
    expect(fired).toBe(0);
  });

  it("never fires after unmount", () => {
    const button = render();
    pointer(button, "pointerdown");
    act(() => vi.advanceTimersByTime(900));
    act(() => root.unmount());
    act(() => vi.advanceTimersByTime(5000));
    expect(fired).toBe(0);
    // afterEach unmounts again — re-root so that stays a no-op.
    act(() => {
      root = createRoot(container);
    });
  });

  it("ignores a hold while disabled", () => {
    const button = render({ disabled: true });
    pointer(button, "pointerdown");
    act(() => vi.advanceTimersByTime(5000));
    expect(fired).toBe(0);
  });

  it("cancels an in-flight hold if it becomes disabled", () => {
    const button = render();
    pointer(button, "pointerdown");
    act(() => vi.advanceTimersByTime(500));
    render({ disabled: true });
    act(() => vi.advanceTimersByTime(5000));
    expect(fired).toBe(0);
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("describes the gesture for screen readers", () => {
    const button = render({ "aria-label": "skip to the next level" });
    const hint = document.getElementById(button.getAttribute("aria-describedby")!);
    expect(hint?.textContent).toBe("press and hold to activate");
    expect(button.getAttribute("aria-label")).toBe("skip to the next level");
  });
});
