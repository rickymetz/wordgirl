import { describe, expect, it } from "vitest";
import { CARD_ASPECT, CARD_GAP, COLS, fitBoard, MIN_CARD, PIP_ROOM, rowWidth } from "./layout";

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

  it("deals landscape cards of one fixed shape, whatever the glyphs, leaving the rest", () => {
    const narrow = fitBoard(12, 350, 560, 1.8);
    const wide = fitBoard(12, 350, 560, ASPECT);
    const cardW = (350 - (COLS - 1) * CARD_GAP) / COLS;
    expect(wide.cardPx).toBe(Math.floor(cardW / CARD_ASPECT));
    expect(narrow.cardPx).toBe(wide.cardPx);
    expect(wide.rows * wide.cardPx + (wide.rows - 1) * CARD_GAP).toBeLessThan(560);
  });

  it("on a short board, shares the height and lets the row take more of it", () => {
    const fit = fitBoard(12, 350, 260, ASPECT);
    expect(fit.cardPx).toBe(Math.floor((260 - 3 * CARD_GAP) / 4));
    expect(fit.rowPx).toBeLessThanOrEqual(Math.floor(0.8 * fit.cardPx));
  });

  it("never sizes a card under the touch floor", () => {
    expect(fitBoard(12, 350, 100, ASPECT).cardPx).toBe(MIN_CARD);
  });
});

describe("rowWidth", () => {
  it("widens a row by the extra gap between copies only", () => {
    const layout = { glyphs: [{ d: "", s: 1, cx: 0, cy: 0, w: 100, stem: 10 }, { d: "", s: 1, cx: 0, cy: 0, w: 1, stem: 1 }, { d: "", s: 1, cx: 0, cy: 0, w: 1, stem: 1 }] as const, gap: 10, pad: 5 };
    expect(rowWidth(layout as never, 0, 3, 4) - rowWidth(layout as never, 0, 3)).toBe(8);
    expect(rowWidth(layout as never, 0, 1, 4)).toBe(rowWidth(layout as never, 0, 1));
  });
});

describe("pip room", () => {
  it("keeps a strip clear for the found-set pips, even on a squeezed board", () => {
    for (const h of [180, 220, 260, 560]) {
      const fit = fitBoard(12, 350, h, 2.4);
      expect((fit.cardPx - fit.rowPx) / 2, `box ${h}`).toBeGreaterThanOrEqual(PIP_ROOM);
    }
  });
});
