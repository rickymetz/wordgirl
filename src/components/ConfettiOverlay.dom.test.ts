import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  CONFETTI_DURATION,
  ConfettiOverlay,
  resolveConfettiVariant,
} from "./ConfettiOverlay";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

/** jsdom has no canvas backend, so stand in a context that just counts the
 *  draw calls — enough to prove whether anything was drawn at all. */
function fakeContext() {
  const calls = { fillRect: 0, fill: 0, clearRect: 0 };
  const ctx = {
    canvas: null,
    globalAlpha: 1,
    fillStyle: "",
    setTransform: () => {},
    translate: () => {},
    rotate: () => {},
    beginPath: () => {},
    lineTo: () => {},
    closePath: () => {},
    clearRect: () => void calls.clearRect++,
    fillRect: () => void calls.fillRect++,
    fill: () => void calls.fill++,
  };
  return { ctx, calls };
}

let container: HTMLDivElement;
let root: Root;
let calls: ReturnType<typeof fakeContext>["calls"];
let getContext: ReturnType<typeof vi.fn>;
/** Media queries that report as matching. */
let matching: string[];

function setMatchMedia() {
  window.matchMedia = ((q: string) => ({
    matches: matching.some((m) => q.includes(m)),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

function mount(variant?: "burst" | "grand") {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
  act(() => {
    root.render(createElement(ConfettiOverlay, variant ? { variant } : {}));
  });
}

const canvas = () => container.querySelector("canvas")!;

beforeEach(() => {
  matching = [];
  setMatchMedia();
  delete document.documentElement.dataset.lowPower;
  const fake = fakeContext();
  calls = fake.calls;
  getContext = vi.fn(() => fake.ctx);
  HTMLCanvasElement.prototype.getContext =
    getContext as unknown as HTMLCanvasElement["getContext"];
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("ConfettiOverlay", () => {
  it("draws nothing at all under prefers-reduced-motion", async () => {
    // The overlay is the ONLY thing marking a perfect day visually, so this
    // guarantee is load-bearing: assert it rather than trusting the read.
    matching = ["prefers-reduced-motion"];
    setMatchMedia();
    mount("grand");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(getContext).not.toHaveBeenCalled();
    expect(calls.fill + calls.fillRect + calls.clearRect).toBe(0);
    // Never sized, so the backing store stays at the 300x150 default and
    // no full-screen layer is allocated.
    expect(canvas().width).toBe(300);
  });

  it("draws for both variants when motion is allowed", async () => {
    mount("grand");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(getContext).toHaveBeenCalledWith("2d");
    expect(canvas().width).toBeGreaterThan(300);
  });

  it("records the tier it asked for and the tier it drew separately", async () => {
    mount("grand");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(canvas().dataset.confetti).toBe("grand");
    expect(canvas().dataset.confettiDrawn).toBe("grand");
  });

  it("downgrades the grand tier on a low-power device", async () => {
    document.documentElement.dataset.lowPower = "true";
    mount("grand");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    // The request is preserved; what was drawn is the cheap tier.
    expect(canvas().dataset.confetti).toBe("grand");
    expect(canvas().dataset.confettiDrawn).toBe("burst");
  });
});

describe("resolveConfettiVariant", () => {
  it("leaves the everyday burst alone", () => {
    document.documentElement.dataset.lowPower = "true";
    expect(resolveConfettiVariant("burst")).toBe("burst");
  });

  it("downgrades grand under prefers-reduced-data", () => {
    matching = ["prefers-reduced-data"];
    setMatchMedia();
    expect(resolveConfettiVariant("grand")).toBe("burst");
  });

  it("downgrades grand on a low-power device", () => {
    document.documentElement.dataset.lowPower = "true";
    expect(resolveConfettiVariant("grand")).toBe("burst");
  });

  it("keeps grand on a capable device", () => {
    expect(resolveConfettiVariant("grand")).toBe("grand");
  });
});

describe("CONFETTI_DURATION", () => {
  it("gives the grand sequence longer than the everyday burst", () => {
    expect(CONFETTI_DURATION.grand).toBeGreaterThan(CONFETTI_DURATION.burst);
  });

  it("keeps the everyday burst a single un-jittered pop", () => {
    // All five solve screens sequence their results reveal against this,
    // so the everyday tier staying one instant pop is the contract; a
    // stagger added here lengthens every game's reveal.
    expect(CONFETTI_DURATION.burst).toBe(1400);
  });

  it("stays short enough to need no pause control (WCAG 2.2.2's 5s)", () => {
    expect(CONFETTI_DURATION.grand).toBeLessThan(5000);
  });
});
