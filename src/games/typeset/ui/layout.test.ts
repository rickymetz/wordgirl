import { describe, expect, it } from "vitest";
import { CARD_GAP, COLS, fitBoard, rowWidth } from "./layout";

const ASPECT = 2.4; // three ¶ in a row

describe("fitBoard", () => {
  it("deals three across, whatever the deal", () => {
    expect(fitBoard(12, 350, 560, ASPECT).rows).toBe(4);
    expect(fitBoard(9, 350, 560, ASPECT).rows).toBe(3);
  });

  it("fits the widest row, open spacing included, inside the card", () => {
    const fit = fitBoard(12, 350, 560, ASPECT);
    const cardW = (350 - (COLS - 1) * CARD_GAP) / COLS;
    expect(fit.rowPx * ASPECT + 6).toBeLessThanOrEqual(cardW);
  });

  it("is height-bound on a short board", () => {
    const fit = fitBoard(12, 350, 200, ASPECT);
    const cardH = (200 - 3 * CARD_GAP) / 4;
    expect(fit.rowPx).toBe(Math.floor(0.8 * cardH));
  });
});

describe("rowWidth", () => {
  it("widens a row by the extra gap between copies only", () => {
    const layout = { glyphs: [{ d: "", s: 1, cx: 0, cy: 0, w: 100, stem: 10 }, { d: "", s: 1, cx: 0, cy: 0, w: 1, stem: 1 }, { d: "", s: 1, cx: 0, cy: 0, w: 1, stem: 1 }] as const, gap: 10, pad: 5 };
    expect(rowWidth(layout as never, 0, 3, 4) - rowWidth(layout as never, 0, 3)).toBe(8);
    expect(rowWidth(layout as never, 0, 1, 4)).toBe(rowWidth(layout as never, 0, 1));
  });
});
