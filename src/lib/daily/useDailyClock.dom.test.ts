import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useClockedDispatch, useDailyClock } from "./useDailyClock";
import { holdModalOpen } from "../modalOpen";
import { useModalFocus } from "../../components/useModalFocus";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type Clock = ReturnType<typeof useDailyClock>;
type Act = { type: string };

let clock: Clock;
let dispatch: (a: Act) => void;
let dispatched: Act[];
const flush = vi.fn();

function Harness({ programmatic }: { programmatic?: string[] }) {
  clock = useDailyClock({ flush, resetKey: "k" });
  dispatch = useClockedDispatch<Act>(
    (a) => dispatched.push(a),
    clock.input,
    programmatic,
  );
  return null;
}

function Dialog() {
  const ref = useModalFocus<HTMLDivElement>(true);
  return createElement("div", { ref, role: "dialog" });
}

let container: HTMLDivElement;
let root: Root;
let hidden = false;

function render(children: ReturnType<typeof createElement>[]) {
  act(() => root.render(children));
}

function setHidden(value: boolean) {
  hidden = value;
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

const advance = (ms: number) => vi.advanceTimersByTime(ms);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-07T12:00:00Z"));
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
  hidden = false;
  dispatched = [];
  flush.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
  render([createElement(Harness, { key: "h" })]);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("useDailyClock — starts at the first input", () => {
  it("accrues nothing before the player's first input", () => {
    advance(5000);
    expect(clock.currentElapsedMs()).toBe(0);
    dispatch({ type: "tap" });
    expect(clock.currentElapsedMs()).toBe(0);
    advance(2000);
    expect(clock.currentElapsedMs()).toBe(2000);
  });

  it("a hydrated save continues from its time, again from the first input", () => {
    advance(1000);
    clock.hydrate(10_000, false);
    advance(5000);
    expect(clock.currentElapsedMs()).toBe(10_000);
    dispatch({ type: "tap" });
    advance(1500);
    expect(clock.currentElapsedMs()).toBe(11_500);
  });

  it("hydration and programmatic actions never start it", () => {
    render([createElement(Harness, { key: "h", programmatic: ["hydrate", "advanceLevel"] })]);
    dispatch({ type: "hydrate" });
    dispatch({ type: "advanceLevel" });
    advance(3000);
    expect(clock.currentElapsedMs()).toBe(0);
    // Every action still reaches the reducer.
    expect(dispatched.map((a) => a.type)).toEqual(["hydrate", "advanceLevel"]);
  });

  it("a day solved before this session keeps its saved time", () => {
    clock.hydrate(42_000, true);
    dispatch({ type: "tap" });
    advance(9000);
    expect(clock.currentElapsedMs()).toBe(42_000);
    expect(clock.freeze()).toBe(42_000);
  });
});

describe("useDailyClock — pauses", () => {
  it("accrues nothing while a modal is open", () => {
    dispatch({ type: "tap" });
    advance(1000);
    const release = holdModalOpen();
    advance(5000);
    expect(clock.currentElapsedMs()).toBe(1000);
    release();
    advance(1000);
    expect(clock.currentElapsedMs()).toBe(2000);
  });

  it("an open useModalFocus dialog pauses it (the house dialogs' signal)", () => {
    dispatch({ type: "tap" });
    advance(1000);
    render([
      createElement(Harness, { key: "h" }),
      createElement(Dialog, { key: "d" }),
    ]);
    advance(4000);
    expect(clock.currentElapsedMs()).toBe(1000);
    render([createElement(Harness, { key: "h" })]);
    advance(500);
    expect(clock.currentElapsedMs()).toBe(1500);
  });

  it("stacked modals count as one open", () => {
    dispatch({ type: "tap" });
    const a = holdModalOpen();
    const b = holdModalOpen();
    advance(1000);
    a();
    a(); // idempotent release
    advance(1000);
    expect(clock.currentElapsedMs()).toBe(0);
    b();
    advance(1000);
    expect(clock.currentElapsedMs()).toBe(1000);
  });

  it("a first input made while a modal is open waits for it to close", () => {
    const release = holdModalOpen();
    dispatch({ type: "hint" });
    advance(3000);
    expect(clock.currentElapsedMs()).toBe(0);
    release();
    advance(700);
    expect(clock.currentElapsedMs()).toBe(700);
  });

  it("pauses while hidden and flushes a save on hide", () => {
    dispatch({ type: "tap" });
    advance(1000);
    setHidden(true);
    expect(flush).toHaveBeenCalledTimes(1);
    advance(60_000);
    expect(clock.currentElapsedMs()).toBe(1000);
    setHidden(false);
    advance(250);
    expect(clock.currentElapsedMs()).toBe(1250);
  });

  it("flushes on pagehide and on unmount", () => {
    window.dispatchEvent(new Event("pagehide"));
    expect(flush).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
    expect(flush).toHaveBeenCalledTimes(2);
    root = createRoot(container);
  });
});

describe("useDailyClock — freezes at the winning input", () => {
  it("the solve time is the stamped input time, not the freeze call's", () => {
    dispatch({ type: "tap" });
    advance(4000);
    dispatch({ type: "winning tap" });
    // The solved render's passive effect runs a frame (or a level
    // animation) later.
    advance(900);
    expect(clock.freeze()).toBe(4000);
    advance(5000);
    expect(clock.freeze()).toBe(4000);
    expect(clock.currentElapsedMs()).toBe(4000);
  });

  it("input(at) stamps the given timestamp", () => {
    dispatch({ type: "tap" });
    advance(2000);
    const at = Date.now();
    advance(300);
    clock.input(at);
    expect(clock.freeze()).toBe(2000);
  });

  it("a word banked past the solve re-stamps without moving the freeze", () => {
    dispatch({ type: "tap" });
    advance(3000);
    dispatch({ type: "threshold word" });
    advance(100);
    expect(clock.freeze()).toBe(3000);
    advance(2000);
    dispatch({ type: "sweep word" });
    advance(400);
    expect(clock.stampedElapsedMs()).toBe(5100);
    expect(clock.currentElapsedMs()).toBe(3000);
  });

  it("freeze with no input this session falls back to live time", () => {
    clock.hydrate(8000, false);
    advance(1000);
    expect(clock.freeze()).toBe(8000);
  });
});
