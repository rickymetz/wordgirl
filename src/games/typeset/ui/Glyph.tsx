import { useId, type CSSProperties, type SVGProps } from "react";
import type { Value } from "../engine/sets";
import { copyTransform, OPEN_STROKE, rowWidth, type GlyphLayout } from "./layout";

/**
 * One drawn glyph in one of the three fills. Settled across four rounds
 * of renders and two multi-reviewer passes — the reasons, so they aren't
 * re-litigated:
 *
 * - SOLID: the ink.
 * - CROSS-HATCH (middle): a 45° lattice over a 25–30% tint of the ink,
 *   with a thin full-ink keyline. Gestalt closure reads the letter; the
 *   tint holds thin strokes together (a bare hatch broke € bars and
 *   script hairlines into debris); the 0.5px keyline holds thin
 *   faces together (without it a ? or a script f breaks into fragments).
 *   Hatch pitch scales with the glyph (~7.5% of the row height) so it stays a
 *   texture at every card size, but never finer than 4.5px with 1.1px lines
 *   (given `rowPx`): finer, a hatch on a thin face blurs into a pale solid,
 *   which reads as a fourth fill.
 * - OPEN: an outline drawn OUTSIDE the letter (paint-order: stroke under a
 *   fill of the card color). An inside band fills a heavy stem completely
 *   below ~18px and reads as solid; outside, every stroke keeps its full
 *   width as a hollow channel at any size. The fill on top also hides any
 *   contour seams the bake didn't merge.
 * - TRAY size (`mini`): a hatch can't resolve at tray size, so the middle
 *   fill becomes a flat wash plus keyline there. The BOARD always hatches:
 *   a wash there (tried, for thin faces) read as a pale tint, a fourth fill,
 *   and contradicted every label and hint that says "cross-hatched".
 * - Open copies are spaced an extra outline width apart (`rowPx` gives the
 *   px-to-units scale; minis take a fixed extra), or outside outlines meet.
 *
 * Stroke widths are in CSS px (non-scaling-stroke), so the keyline and
 * the open band are the same weight on every card at every Text size.
 */
interface Props {
  layout: GlyphLayout;
  glyph: Value;
  /** Copies in the row (a card's count). */
  count?: number;
  ink: Value;
  fill: Value;
  mini?: boolean;
  /** The row's rendered height in px, when known; spaces open copies apart by their outline. */
  rowPx?: number;
  /** Paint the glyph in neutral ink (the ? sheet, credits), ignoring `ink`. */
  neutral?: boolean;
  className?: string;
  /** Sizing: set a height; the width follows from the row's aspect ratio. */
  style?: CSSProperties;
}

export function Glyph({ layout, glyph, count = 1, ink, fill, mini = false, rowPx, neutral = false, className, style }: Props) {
  // useId's characters («r1», :r1:) are not safe inside url(); keep [\w-].
  const id = `ts-hatch-${useId().replace(/[^\w-]/g, "")}`;
  const flat = mini;
  // Layout units per CSS px, when the drawn size is known.
  const unitsPerPx = rowPx ? layout.height / rowPx : 0;
  const extraGap = fill !== 2 ? 0 : unitsPerPx ? OPEN_STROKE * unitsPerPx : mini ? layout.gap * 1.5 : 0;
  const width = rowWidth(layout, glyph, count, extraGap);
  const color = neutral ? "var(--color-ink)" : `var(--typeset-ink-${ink})`;
  const pitch = Math.max(layout.height * 0.075, 4.5 * unitsPerPx);
  const line = Math.max(pitch * 0.23, 1.1 * unitsPerPx);

  let paint: SVGProps<SVGPathElement>;
  if (fill === 0) {
    paint = { style: { fill: color } };
  } else if (fill === 1) {
    paint = flat
      ? { style: { fill: neutral ? "var(--color-ink-soft)" : `var(--typeset-wash-${ink})`, stroke: color, strokeWidth: 0.75 } }
      : { style: { fill: `url(#${id})`, stroke: color, strokeWidth: 0.5 } };
  } else {
    paint = {
      style: { fill: "var(--color-surface-raised)", stroke: color, strokeWidth: mini ? 2 : OPEN_STROKE, paintOrder: "stroke" },
    };
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${layout.height}`}
      className={className}
      // Outside outlines may cross the viewBox edge; never clip them.
      style={{ aspectRatio: `${width} / ${layout.height}`, overflow: "visible", ...style }}
      aria-hidden
      focusable="false"
    >
      {fill === 1 && !flat && (
        <defs>
          <pattern id={id} width={pitch} height={pitch} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={pitch} height={pitch} style={{ fill: neutral ? "var(--color-tile)" : `var(--typeset-tint-${ink})` }} />
            <rect width={line} height={pitch} style={{ fill: color }} />
            <rect width={pitch} height={line} style={{ fill: color }} />
          </pattern>
        </defs>
      )}
      {Array.from({ length: count }, (_, k) => (
        <path
          key={k}
          d={layout.glyphs[glyph].d}
          transform={copyTransform(layout, glyph, k, extraGap)}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          {...paint}
        />
      ))}
    </svg>
  );
}
