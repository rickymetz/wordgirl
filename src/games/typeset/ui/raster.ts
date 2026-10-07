/**
 * A tiny rasterizer for the baked outlines, so tests can LOOK at a glyph
 * the way a player does instead of trusting the pool's labels. Test-only:
 * nothing in the app imports it.
 *
 * The bake writes absolute M, L, H, V, Q and Z commands only (with
 * implicit repeats after M and L); anything else throws, so a bake change
 * can't make the tests silently measure nothing.
 */
import type { Outline } from "./layout";

type Pt = [number, number];

/** Flattens a path to closed polygons (quadratics split into `steps` lines). */
export function flatten(d: string, steps = 8): Pt[][] {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const polys: Pt[][] = [];
  let poly: Pt[] = [];
  let cur: Pt = [0, 0];
  let cmd = "";
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    switch (cmd) {
      case "M":
        if (poly.length) polys.push(poly);
        cur = [num(), num()];
        poly = [cur];
        cmd = "L"; // implicit repeats after M are line-tos
        break;
      case "L":
        cur = [num(), num()];
        poly.push(cur);
        break;
      case "H":
        cur = [num(), cur[1]];
        poly.push(cur);
        break;
      case "V":
        cur = [cur[0], num()];
        poly.push(cur);
        break;
      case "Q": {
        const c: Pt = [num(), num()];
        const e: Pt = [num(), num()];
        for (let k = 1; k <= steps; k++) {
          const t = k / steps;
          const u = 1 - t;
          poly.push([u * u * cur[0] + 2 * u * t * c[0] + t * t * e[0], u * u * cur[1] + 2 * u * t * c[1] + t * t * e[1]]);
        }
        cur = e;
        break;
      }
      case "Z":
        if (poly.length) polys.push(poly);
        poly = [];
        break;
      default:
        throw new Error(`raster: unsupported path command ${cmd}`);
    }
  }
  if (poly.length) polys.push(poly);
  return polys;
}

export interface Mask {
  w: number;
  h: number;
  /** 1 where ink is, row-major. */
  px: Uint8Array;
}

/**
 * Rasterizes an outline (nonzero winding, sampled at pixel centers) into a
 * `w` x `h` mask: outline units are multiplied by `scale`, then the ink
 * box's center lands on the mask's center.
 */
export function rasterize(o: Outline, scale: number, w: number, h: number): Mask {
  const cx = (o.box[0] + o.box[2]) / 2;
  const cy = (o.box[1] + o.box[3]) / 2;
  const polys = flatten(o.d).map((p) => p.map(([x, y]) => [(x - cx) * scale + w / 2, (y - cy) * scale + h / 2] as Pt));
  const px = new Uint8Array(w * h);
  for (let row = 0; row < h; row++) {
    const y = row + 0.5;
    const hits: [number, number][] = [];
    for (const p of polys)
      for (let k = 0; k < p.length; k++) {
        const [x0, y0] = p[k];
        const [x1, y1] = p[(k + 1) % p.length];
        if (y0 <= y === y1 <= y) continue;
        hits.push([x0 + ((y - y0) / (y1 - y0)) * (x1 - x0), y1 > y0 ? 1 : -1]);
      }
    hits.sort((a, b) => a[0] - b[0]);
    let wind = 0;
    for (let k = 0; k < hits.length - 1; k++) {
      wind += hits[k][1];
      if (wind === 0) continue;
      const from = Math.max(0, Math.ceil(hits[k][0] - 0.5));
      const to = Math.min(w - 1, Math.floor(hits[k + 1][0] - 0.5));
      for (let col = from; col <= to; col++) px[row * w + col] = 1;
    }
  }
  return { w, h, px };
}

/** Share of the two masks' combined ink they hold in common (intersection over union). */
export function overlap(a: Mask, b: Mask): number {
  let both = 0;
  let either = 0;
  for (let k = 0; k < a.px.length; k++) {
    both += a.px[k] & b.px[k];
    either += a.px[k] | b.px[k];
  }
  return either ? both / either : 1;
}
