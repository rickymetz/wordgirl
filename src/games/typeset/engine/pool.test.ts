import { describe, expect, it } from "vitest";
import glyphs from "../glyphs.json";
import { FACES, MONO_TELLING, SILHOUETTE } from "./faces";
import { blockedReading, CHARSET_POOL, FACES_POOL } from "./pool";
import { TUTORIAL_BOARDS } from "./tutorial";

describe("baked outlines", () => {
  // Fails after a pool edit until scripts/bake-typeset-glyphs.py is re-run.
  it("has an outline for every (face, character) the pool and tutorial use", () => {
    const baked = glyphs.glyphs as Record<string, unknown>;
    const missing: string[] = [];
    for (const e of CHARSET_POOL) for (const c of e.chars) if (!baked[`${e.face}:${c.char}`]) missing.push(`${e.face}:${c.char}`);
    for (const e of FACES_POOL) for (const f of e.faces) if (!baked[`${f}:${e.char.char}`]) missing.push(`${f}:${e.char.char}`);
    for (const b of TUTORIAL_BOARDS) for (const g of b.glyphs) if (!baked[`${g.face}:${g.char}`]) missing.push(`${g.face}:${g.char}`);
    expect(missing).toEqual([]);
  });
});

describe("what a board may spell", () => {
  // A retired entry keeps the boards it already played; nothing else may
  // spell a NEVER_SPELLED word again.
  it("is nothing on the list, for every live entry and the tutorial", () => {
    const boards = [
      ...CHARSET_POOL.filter((e) => e.until === undefined).map((e) => e.chars.map((c) => c.char)),
      ...FACES_POOL.filter((e) => e.until === undefined).map((e) => [e.char.char]),
      ...TUTORIAL_BOARDS.map((b) => b.glyphs.map((g) => g.char)),
    ];
    expect(boards.map((chars) => blockedReading(chars)).filter(Boolean)).toEqual([]);
  });

  it("is read on one card and across cards, and the capital SS only as written", () => {
    expect(blockedReading(["k"])).toBe("kkk");
    expect(blockedReading(["A", "g", "s"])).toBe("Ass");
    expect(blockedReading(["G", "a", "y"])).toBe("Gay");
    expect(blockedReading(["S"])).toBe("SS");
    expect(blockedReading(["M", "y", "s"])).toBeNull();
  });
});

describe("charset pool", () => {
  it("gives every entry three distinct characters, none of them digits", () => {
    for (const entry of CHARSET_POOL) {
      const chars = entry.chars.map((c) => c.char);
      expect(new Set(chars).size, chars.join(" ")).toBe(3);
      for (const c of chars) expect(/\p{Nd}/u.test(c), c).toBe(false);
    }
  });

  it("never schedules a known lookalike pair", () => {
    const lookalikes = [["l", "I"], ["l", "1"], ["I", "1"], ["O", "0"], ["O", "o"], ["€", "£"]];
    for (const entry of CHARSET_POOL) {
      const chars = entry.chars.map((c) => c.char);
      for (const [x, y] of lookalikes) expect(chars.includes(x) && chars.includes(y), chars.join(" ")).toBe(false);
    }
  });

  it("does not repeat a trio in the same face", () => {
    const keys = CHARSET_POOL.map((e) => `${e.face}:${e.chars.map((c) => c.char).sort().join("")}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("names every character for screen readers", () => {
    for (const entry of CHARSET_POOL)
      for (const c of entry.chars) {
        expect(c.name.length).toBeGreaterThan(0);
        expect(c.plural).not.toBe(c.name);
      }
  });
});

describe("faces pool", () => {
  it("draws each trio from three different families", () => {
    for (const entry of FACES_POOL) {
      const families = entry.faces.map((f) => FACES[f].family);
      expect(new Set(families).size, entry.char.char).toBe(3);
    }
  });

  it("draws each trio from three different silhouettes, so the faces part at a glance", () => {
    for (const entry of FACES_POOL) {
      const shapes = entry.faces.map((f) => SILHOUETTE[FACES[f].family]);
      expect(new Set(shapes).size, `${entry.char.char}: ${shapes.join(", ")}`).toBe(3);
    }
  });

  it("gives a trio with the monospace a letter that shows it", () => {
    for (const entry of FACES_POOL) {
      if (entry.faces.some((f) => FACES[f].family === "Monospace")) expect(MONO_TELLING.has(entry.char.char), entry.char.char).toBe(true);
    }
  });

  it("uses every face at its heaviest weight (at least 400 for single-weight display faces)", () => {
    for (const face of Object.values(FACES)) expect(face.weight).toBeGreaterThanOrEqual(400);
  });
});
