import { useId, type SVGProps } from "react";
import type { Value } from "../engine/sets";
import type { GlyphLayout } from "./layout";

/**
 * One drawn glyph in one of the three fills. Settled across four rounds
 * of renders and two multi-reviewer passes — the reasons, so they aren't
 * re-litigated:
 *
 * - SOLID: the ink.
 * - CROSS-HATCH (middle): a 45° lattice over a 25–30% tint of the ink,
 *   with a thin full-ink keyline. Gestalt closure reads the letter; the
 *   tint holds thin strokes together (a bare hatch broke € bars and
 *   script hairlines into debris); the keyline keeps the silhouette crisp.
 *   Hatch pitch scales with the glyph (~8.5% of the box) so it stays a
 *   texture at every card size.
 * - OPEN: an outline drawn OUTSIDE the letter (paint-order: stroke under a
 *   fill of the card color). An inside band fills a heavy stem completely
 *   below ~18px and reads as solid; outside, every stroke keeps its full
 *   width as a hollow channel at any size. The fill on top also hides any
 *   contour seams the bake didn't merge.
 * - TRAY size (`mini`): a hatch can't resolve at ~14px, so the middle fill
 *   becomes a flat wash plus keyline there.
 *
 * Stroke widths are in CSS px (non-scaling-stroke), so the keyline and
 * the open band are the same weight on every card at every Text size.
 */
interface Props {
  layout: GlyphLayout;
  glyph: Value;
  ink: Value;
  fill: Value;
  mini?: boolean;
  /** Paint the glyph in neutral ink (legend chips), ignoring `ink`. */
  neutral?: boolean;
  className?: string;
}

export function Glyph({ layout, glyph, ink, fill, mini = false, neutral = false, className }: Props) {
  // useId's characters («r1», :r1:) are not safe inside url(); keep [\w-].
  const id = `ts-hatch-${useId().replace(/[^\w-]/g, "")}`;
  const { size } = layout;
  const placed = layout.glyphs[glyph];
  const color = neutral ? "var(--color-ink)" : `var(--typeset-ink-${ink})`;
  const pitch = size * 0.085;
  const line = pitch * 0.23;

  let paint: SVGProps<SVGPathElement>;
  if (fill === 0) {
    paint = { style: { fill: color } };
  } else if (fill === 1) {
    paint = mini
      ? { style: { fill: neutral ? "var(--color-ink-soft)" : `var(--typeset-wash-${ink})`, stroke: color, strokeWidth: 0.75 } }
      : { style: { fill: `url(#${id})`, stroke: color, strokeWidth: 0.75 } };
  } else {
    paint = {
      style: { fill: "var(--color-surface-raised)", stroke: color, strokeWidth: mini ? 2 : 3, paintOrder: "stroke" },
    };
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden focusable="false">
      {fill === 1 && !mini && (
        <defs>
          <pattern id={id} width={pitch} height={pitch} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={pitch} height={pitch} style={{ fill: neutral ? "var(--color-tile)" : `var(--typeset-tint-${ink})` }} />
            <rect width={line} height={pitch} style={{ fill: color }} />
            <rect width={pitch} height={line} style={{ fill: color }} />
          </pattern>
        </defs>
      )}
      <path
        d={placed.d}
        transform={placed.transform}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        {...paint}
      />
    </svg>
  );
}
