import previewGlyphs from "../preview-glyphs.json";
import type { Card } from "../engine/sets";
import { Glyph } from "./Glyph";
import { layoutOutlines, type Outline } from "./layout";

/**
 * Hub-card miniature: three cards that make a set — every attribute
 * different, so the one preview shows all three counts, inks and fills.
 */
// The first pool entry's three glyphs, baked into their own 2 KB file so
// the hub bundle never carries the full outline set.
const LAYOUT = layoutOutlines(previewGlyphs as unknown as [Outline, Outline, Outline], "charset");
const CARDS: Card[] = [
  [0, 0, 0, 0],
  [1, 1, 1, 1],
  [2, 2, 2, 2],
];

export function TypesetPreview() {
  return (
    <div className="flex gap-1" aria-hidden>
      {CARDS.map((card, i) => (
        <div key={i} className="flex h-[40px] w-[32px] items-center justify-center rounded-md bg-surface">
          {Array.from({ length: card[1] + 1 }, (_, n) => (
            <Glyph key={n} layout={LAYOUT} glyph={card[0]} ink={card[2]} fill={card[3]} mini className="h-4 w-[10px]" />
          ))}
        </div>
      ))}
    </div>
  );
}
