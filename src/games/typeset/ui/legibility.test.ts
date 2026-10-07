import { describe, expect, it } from "vitest";
import { CHARSET_POOL, FACES_POOL } from "../engine/pool";
import type { Board, BoardGlyph } from "../engine/schedule";
import { TUTORIAL_BOARDS } from "../engine/tutorial";
import { layoutGlyphs, outlineFor } from "./glyphLayout";
import { layoutOutlines, type Outline } from "./layout";
import fixtures from "./legibility.fixtures.json";
import { hatchRatios, silhouetteOverlap } from "./legibility";
import { flatten, overlap, rasterize } from "./raster";

/**
 * A stroke must be at least this share of the hatch pitch, at a 375px
 * phone's board size, or the middle fill reads as a pale solid. Calibrated
 * by eye on renders: the launch-day pool's thin strokes sat at 0.36
 * (Fraunces "#"), 0.40 (Kaushan "&") and 0.46 (Lobster "W"); the thinnest
 * glyph that still reads as hatched is Fraunces' "@" at 0.49.
 */
const MIN_HATCH = 0.48;

/**
 * Two faces on one board may share at most this much of their ink. The
 * launch-day twins (Literata and Jost "e") share 0.84; the closest pairs
 * that read apart at a glance (Fraunces/Archivo Black "b", Archivo
 * Black/Roboto Slab "R") share up to 0.73.
 */
const MAX_OVERLAP = 0.76;

type Named = { name: string; kind: Board["kind"]; glyphs: readonly BoardGlyph[] };

const boards: Named[] = [
  ...CHARSET_POOL.map((e) => ({
    name: `${e.theme} in ${e.face}: ${e.chars.map((c) => c.char).join(" ")}`,
    kind: "charset" as const,
    glyphs: e.chars.map((c) => ({ ...c, face: e.face })),
  })),
  ...FACES_POOL.map((e) => ({
    name: `faces "${e.char.char}": ${e.faces.join(", ")}`,
    kind: "faces" as const,
    glyphs: e.faces.map((face) => ({ ...e.char, face })),
  })),
  ...TUTORIAL_BOARDS.map((b) => ({ name: `tutorial (${b.kind})`, kind: b.kind, glyphs: b.glyphs })),
];

const key = (g: BoardGlyph) => `${g.face}:${g.char}`;

describe("every board a player can be dealt", () => {
  it("draws every stroke thick enough to show the cross-hatch at phone size", () => {
    const thin: string[] = [];
    for (const b of boards) {
      const ratios = hatchRatios(layoutGlyphs(b.glyphs as Board["glyphs"], b.kind));
      ratios.forEach((r, i) => {
        if (r < MIN_HATCH) thin.push(`${key(b.glyphs[i])} at ${r.toFixed(2)} (${b.name})`);
      });
    }
    expect(thin).toEqual([]);
  });

  it("never sets two faces that draw their letter alike", () => {
    const twins: string[] = [];
    for (const b of boards) {
      if (b.kind !== "faces") continue;
      for (let i = 0; i < 3; i++)
        for (let j = i + 1; j < 3; j++) {
          const o = silhouetteOverlap(outlineFor(b.glyphs[i]), outlineFor(b.glyphs[j]));
          if (o > MAX_OVERLAP) twins.push(`${key(b.glyphs[i])} vs ${key(b.glyphs[j])} at ${o.toFixed(2)} (${b.name})`);
        }
    }
    expect(twins).toEqual([]);
  });
});

// The launch-day failures, kept as fixtures: if a change to the measures
// (or the rasterizer) stops catching them, the checks above prove nothing.
describe("the checks still catch what reached players on launch day", () => {
  const O = fixtures.glyphs as unknown as Record<string, Outline>;

  it("flags Fraunces' # as too thin to hatch, and passes its & and @", () => {
    const ratios = hatchRatios(layoutOutlines([O["fraunces:&"], O["fraunces:@"], O["fraunces:#"]], "charset"));
    expect(ratios[2]).toBeLessThan(MIN_HATCH);
    expect(ratios[0]).toBeGreaterThanOrEqual(MIN_HATCH);
    expect(ratios[1]).toBeGreaterThanOrEqual(MIN_HATCH);
  });

  it("flags Literata's and Jost's e as twins", () => {
    expect(silhouetteOverlap(O["literata:e"], O["jost:e"])).toBeGreaterThan(MAX_OVERLAP);
  });
});

describe("raster", () => {
  const square: Outline = { d: "M0 0H100V-100H0Z", adv: 100, box: [0, -100, 100, 0] };

  it("fills a square to its area, and a hole cut the other way stays empty", () => {
    const m = rasterize(square, 0.4, 60, 60);
    expect(m.px.reduce((a, b) => a + b, 0)).toBe(40 * 40);
    const ring: Outline = { ...square, d: `${square.d}M25 -25V-75H75V-25Z` };
    const r = rasterize(ring, 0.4, 60, 60);
    expect(r.px.reduce((a, b) => a + b, 0)).toBe(40 * 40 - 20 * 20);
  });

  it("reads implicit line-tos and quadratics, and refuses commands the bake never writes", () => {
    expect(flatten("M0 0 10 0 10 10Z")[0]).toHaveLength(3);
    expect(flatten("M0 0Q5 10 10 0Z", 4)[0]).toHaveLength(5);
    expect(() => flatten("M0 0C1 1 2 2 3 3Z")).toThrow(/unsupported/);
  });

  it("scores a glyph against itself as identical", () => {
    const m = rasterize((fixtures.glyphs as unknown as Record<string, Outline>)["jost:e"], 0.1, 80, 80);
    expect(overlap(m, m)).toBe(1);
  });
});
