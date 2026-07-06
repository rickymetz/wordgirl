/**
 * CSS can only animate between two `polygon()` clip-paths with the same
 * vertex count, and 3..10-gons don't share one — so every polygon is
 * emitted as SAMPLES points spread along its perimeter. Morphing a
 * triangle into a square is then a single CSS clip-path transition.
 */
const SAMPLES = 60;

export const POLYGON_NAMES: Record<number, string> = {
  3: "Triangle",
  4: "Square",
  5: "Pentagon",
  6: "Hexagon",
  7: "Heptagon",
  8: "Octagon",
  9: "Nonagon",
  10: "Decagon",
};

const cache = new Map<string, string>();

/**
 * Vertices of a regular n-gon in a 0–100 coordinate box, oriented with a
 * flat bottom: odd-sided shapes get an apex up (triangle, pentagon…),
 * even-sided ones a flat top and bottom (square, hexagon…) — otherwise a
 * square reads as a diamond.
 */
function vertices(n: number): [number, number][] {
  const offset = n % 2 === 0 ? 180 / n : 0;
  const out: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const angle = (-90 + offset + (k * 360) / n) * (Math.PI / 180);
    out.push([50 + 50 * Math.cos(angle), 50 + 50 * Math.sin(angle)]);
  }
  return out;
}

/**
 * The clip-path is applied to the BUTTON element itself so that pointer
 * hit-testing follows the polygon — with tiles sitting flush against the
 * central shape, overlapping square boxes would steal each other's taps.
 * `flipped` rotates the polygon 180° (outer tiles mirror the central
 * shape across the shared edge) without rotating the button's content.
 */
export function regularPolygonClipPath(n: number, flipped = false): string {
  const key = `${n}:${flipped}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const verts = vertices(n);
  const points: string[] = [];
  for (let s = 0; s < SAMPLES; s++) {
    // Position along the perimeter in segment units [0, n).
    const t = (s / SAMPLES) * n;
    const seg = Math.floor(t);
    const frac = t - seg;
    const [x1, y1] = verts[seg];
    const [x2, y2] = verts[(seg + 1) % n];
    let x = x1 + (x2 - x1) * frac;
    let y = y1 + (y2 - y1) * frac;
    if (flipped) {
      x = 100 - x;
      y = 100 - y;
    }
    points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }
  const path = `polygon(${points.join(", ")})`;
  cache.set(key, path);
  return path;
}

/**
 * Outer tiles sit flush against the central shape's edges — Triforce at
 * the triangle level, honeycomb at the hexagon. Congruent edge-neighbors
 * only fit without overlapping EACH OTHER up to n=6; beyond that the
 * tiles must shrink. Scales computed numerically (SAT separation ≥ 0.02
 * between adjacent tiles) — see scripts note in the repo history.
 */
export const TILE_SCALE: Record<number, number> = {
  3: 0.97,
  4: 0.97,
  5: 0.975,
  6: 0.975,
  7: 0.65,
  8: 0.53,
  9: 0.465,
  10: 0.43,
};

/**
 * Odd-sided clusters are vertically asymmetric (the Triforce hangs low);
 * shift the whole board content by this many central-circumradius units
 * to visually center it. Computed from cluster bounding boxes.
 */
export const CLUSTER_Y_OFFSET: Record<number, number> = {
  3: -0.478,
  4: 0,
  5: -0.246,
  6: 0,
  7: -0.106,
  8: 0,
  9: -0.056,
  10: 0,
};

/** Apothem of a regular n-gon with circumradius 1. */
export function apothem(n: number): number {
  return Math.cos(Math.PI / n);
}

/** Farthest tile point from board center, in central-circumradius units. */
export function boardExtent(n: number): number {
  const s = TILE_SCALE[n];
  return apothem(n) * (1 + s) + s;
}

/**
 * Angle (radians) toward the midpoint of central edge i — where tile i
 * sits. Must match the flat-bottom orientation of vertices().
 */
export function edgeMidAngle(i: number, n: number): number {
  const offset = n % 2 === 0 ? 180 / n : 0;
  return ((-90 + offset + ((i + 0.5) * 360) / n) * Math.PI) / 180;
}
