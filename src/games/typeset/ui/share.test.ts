import { describe, expect, it } from "vitest";
import { SHARE_URL } from "../../../lib/share";
import { dailyBoard } from "../engine/schedule";
import { buildShareText } from "./GameScreen";

describe("share string", () => {
  const board = dailyBoard("2026-10-07", "charset");

  it("is three tight lines: emoji-led header, result, link", () => {
    const text = buildShareText(board, 4, 0, "2026-10-07", 134_000);
    expect(text.split("\n")).toEqual(["🖋️ Typeset — October 7", "Characters · 4 sets · ⏱️ 2:14 · 😎 0", SHARE_URL]);
  });

  it("counts hints only when there are some", () => {
    expect(buildShareText(board, 4, 2, "2026-10-07", 60_000).split("\n")[1]).toBe("Characters · 4 sets · ⏱️ 1:00 · 🫣 2");
  });

  it("is no longer than the siblings' lines, whatever the day's theme, on a long day", () => {
    // 8 sets, ten minutes, a few hints. Crosshatch's everyday line
    // ("Normal · 11/11 words · ⏱️ 2:14 · 😎 0") is 36 code points; the
    // board's theme would push this past 45, so the line names the kind.
    const faces = dailyBoard("2026-10-07", "faces");
    for (const b of [board, faces]) {
      const line = buildShareText(b, 8, 3, "2026-10-07", 599_000).split("\n")[1];
      expect([...line].length).toBeLessThanOrEqual(36);
    }
  });
});
