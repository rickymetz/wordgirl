import previewGlyphs from "../preview-glyphs.json";
import type { Card } from "../engine/sets";
import { Glyph } from "./Glyph";
import { CARD_ASPECT, layoutOutlines, type Outline } from "./layout";

/**
 * Hub-card miniature: three cards that make a set — every attribute
 * different, so the one preview shows all three counts, inks and fills.
 */
// The first pool entry's three glyphs, baked into their own 2 KB file so
// the hub bundle never carries the full outline set.
const LAYOUT = layoutOutlines(previewGlyphs as unknown as [Outline, Outline, Outline], "charset");
/** The board's card in miniature: 1.5:1 (CARD_ASPECT), stacked, about as tall as the siblings' art. */
const CARD_H = 30;
const CARD_W = CARD_H * CARD_ASPECT;
/** One row height for all three cards, as on the board (see fitBoard). */
const ROW_H = Math.floor(Math.min(0.8 * CARD_H, (0.86 * CARD_W) / LAYOUT.maxRowAspect));
const CARDS: Card[] = [
  [0, 0, 0, 0],
  [1, 1, 1, 1],
  [2, 2, 2, 2],
];

export function TypesetPreview() {
  return (
    <div className="flex flex-col gap-[3px]" aria-hidden>
      {CARDS.map((card, i) => (
        <div key={i} className="flex items-center justify-center rounded-md border border-line bg-surface" style={{ width: CARD_W, height: CARD_H }}>
          <Glyph layout={LAYOUT} glyph={card[0]} count={card[1] + 1} ink={card[2]} fill={card[3]} mini rowPx={ROW_H} style={{ height: ROW_H }} />
        </div>
      ))}
    </div>
  );
}
