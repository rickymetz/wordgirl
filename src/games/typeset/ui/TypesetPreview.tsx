import previewGlyphs from "../preview-glyphs.json";
import { Glyph } from "./Glyph";
import { layoutOutlines, type Outline } from "./layout";

/**
 * Hub-card art: a specimen print. One large Lobster ampersand printed three
 * times, offset like overlapping proofs: open teal at the back, cross-hatched
 * gold, solid violet in front — the three inks and the three fills at once,
 * at the siblings' visual weight (three tiny cards read as a smudge).
 */
// Lobster's "&", baked into its own small file so the hub bundle never
// carries the full outline set.
const [AMP] = previewGlyphs as unknown as [Outline];
const LAYOUT = layoutOutlines([AMP, AMP, AMP], "charset");
/** Glyph height, px, and each print's offset in the 92px art box. */
const ROW_H = 78;
const PRINTS = [
  { ink: 2, fill: 2, x: 20, y: 0 },
  { ink: 1, fill: 1, x: 11, y: 6 },
  { ink: 0, fill: 0, x: 2, y: 12 },
] as const;

export function TypesetPreview() {
  return (
    <div className="relative h-[90px] w-[92px]" aria-hidden>
      {PRINTS.map((p, i) => (
        <div key={i} className="absolute" style={{ left: p.x, top: p.y }}>
          <Glyph layout={LAYOUT} glyph={0} ink={p.ink} fill={p.fill} rowPx={ROW_H} style={{ height: ROW_H }} />
        </div>
      ))}
    </div>
  );
}
