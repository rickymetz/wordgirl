import { describe, expect, it } from "vitest";
import { SHARE_URL } from "../../../lib/share";
import { dailyBoard } from "../engine/schedule";
import { buildShareText } from "./GameScreen";

describe("share string", () => {
  const board = dailyBoard("2026-10-07", "charset");

  it("is three tight lines: emoji-led header, result, link", () => {
    const text = buildShareText(board, 4, 0, 0, "2026-10-07", 134_000);
    expect(text.split("\n")).toEqual([
      "🖋️ Typeset — October 7",
      `${board.label} · 4/${board.sets.length} sets · ⏱️ 2:14 · 😎 0`,
      SHARE_URL,
    ]);
  });

  it("adds misses and hints only when there are some", () => {
    const text = buildShareText(board, 4, 2, 1, "2026-10-07", 60_000);
    expect(text.split("\n")[1]).toBe(`${board.label} · 4/${board.sets.length} sets · ⏱️ 1:00 · ❌ 1 · 🫣 2`);
  });
});
