import { describe, expect, it } from "vitest";
import { CARD_GAP, fitBoard, MIN_CARD, rowWidth } from "./layout";

const ASPECT = 2.4; // three ¶ in a row

describe("fitBoard", () => {
  it("deals a phone board as two columns of landscape cards, half again larger", () => {
    const two = fitBoard(12, 350, 560, ASPECT);
    const three = fitBoard(12, 350, 560, ASPECT, 3);
    expect(two.cols).toBe(2);
    expect(two.rowPx).toBeGreaterThan(three.rowPx * 1.4);
  });

  it("deals the tutorial's nine in two columns too, when that draws them larger", () => {
    const fit = fitBoard(9, 350, 560, ASPECT);
    expect(fit).toMatchObject({ cols: 2, rows: 5 });
  });

  it("keeps every card above the touch floor when any layout can", () => {
    // Too short for six rows of 44px; four rows fit.
    const fit = fitBoard(12, 350, 250, ASPECT);
    expect(fit.cols).toBe(3);
    expect((250 - (fit.rows - 1) * CARD_GAP) / fit.rows).toBeGreaterThanOrEqual(MIN_CARD);
  });

  it("falls back to the fewest rows when nothing fits, so the floor it sets then fits", () => {
    const fit = fitBoard(12, 350, 100, ASPECT);
    expect(fit.cols).toBe(4);
    const floor = fit.rows * MIN_CARD + (fit.rows - 1) * CARD_GAP;
    expect(fitBoard(12, 350, floor, ASPECT).cols).toBe(4);
  });

  it("holds a chosen column count", () => {
    expect(fitBoard(12, 350, 200, ASPECT, 2).cols).toBe(2);
  });

  it("fits the widest row, open spacing included, inside the card", () => {
    const fit = fitBoard(12, 350, 560, ASPECT);
    const cardW = (350 - (fit.cols - 1) * CARD_GAP) / fit.cols;
    expect(fit.rowPx * ASPECT + 6).toBeLessThanOrEqual(cardW);
  });
});

describe("rowWidth", () => {
  it("widens a row by the extra gap between copies only", () => {
    const layout = { glyphs: [{ d: "", s: 1, cx: 0, cy: 0, w: 100, stem: 10 }, { d: "", s: 1, cx: 0, cy: 0, w: 1, stem: 1 }, { d: "", s: 1, cx: 0, cy: 0, w: 1, stem: 1 }] as const, gap: 10, pad: 5 };
    expect(rowWidth(layout as never, 0, 3, 4) - rowWidth(layout as never, 0, 3)).toBe(8);
    expect(rowWidth(layout as never, 0, 1, 4)).toBe(rowWidth(layout as never, 0, 1));
  });
});
