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

/**
 * Flower layout: petal tiles of circumradius 1 arranged radially around
 * a smaller central shape (CENTER_RATIO), each petal rotated so its base
 * faces the center and its apex points outward. `d` is the petal ring
 * radius: the flush apothem-to-apothem distance, pushed out where
 * adjacent petals would otherwise collide (checked numerically via SAT).
 * `extent` = d + 1 is the cluster radius; `yOffset` recenters the
 * vertically-asymmetric odd-sided clusters.
 */
export const CENTER_RATIO = 0.62;

export const FLOWER: Record<number, { d: number; extent: number; yOffset: number }> = {
  3: { d: 1.03, extent: 2.03, yOffset: -0.507 },
  4: { d: 1.456, extent: 2.456, yOffset: 0 },
  5: { d: 1.656, extent: 2.656, yOffset: -0.254 },
  6: { d: 1.773, extent: 2.773, yOffset: 0 },
  7: { d: 2.295, extent: 3.295, yOffset: -0.163 },
  8: { d: 2.672, extent: 3.672, yOffset: 0 },
  9: { d: 2.942, extent: 3.942, yOffset: -0.119 },
  10: { d: 3.146, extent: 4.146, yOffset: 0 },
};

const cache = new Map<string, string>();

/** Vertices of a regular n-gon in a 0–100 box, flat-bottom orientation. */
function vertices(n: number, rotationDeg: number): [number, number][] {
  const offset = n % 2 === 0 ? 180 / n : 0;
  const out: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const angle = (-90 + offset + (k * 360) / n + rotationDeg) * (Math.PI / 180);
    out.push([50 + 50 * Math.cos(angle), 50 + 50 * Math.sin(angle)]);
  }
  return out;
}

/**
 * The clip-path is applied to the BUTTON element itself so that pointer
 * hit-testing follows the polygon. `rotationDeg` spins the polygon
 * without rotating the button's content — petals use it to point their
 * apex outward while their letters stay upright.
 */
export function regularPolygonClipPath(n: number, rotationDeg = 0): string {
  const key = `${n}:${rotationDeg.toFixed(1)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const verts = vertices(n, rotationDeg);
  const points: string[] = [];
  for (let s = 0; s < SAMPLES; s++) {
    // Position along the perimeter in segment units [0, n).
    const t = (s / SAMPLES) * n;
    const seg = Math.floor(t);
    const frac = t - seg;
    const [x1, y1] = verts[seg];
    const [x2, y2] = verts[(seg + 1) % n];
    const x = x1 + (x2 - x1) * frac;
    const y = y1 + (y2 - y1) * frac;
    points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }
  const path = `polygon(${points.join(", ")})`;
  cache.set(key, path);
  return path;
}

/**
 * Direction (degrees) toward the midpoint of central edge i — where
 * petal i sits. Matches the flat-bottom orientation of vertices().
 */
export function edgeMidDeg(i: number, n: number): number {
  const offset = n % 2 === 0 ? 180 / n : 0;
  return -90 + offset + ((i + 0.5) * 360) / n;
}
