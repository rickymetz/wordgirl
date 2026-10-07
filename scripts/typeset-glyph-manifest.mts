/**
 * Prints, as JSON, every (face, character) pair Typeset can show, plus
 * each face's Google Fonts family and weight. Read by
 * bake-typeset-glyphs.py; run through vite-node so the pool stays the one
 * source of truth.
 */
import { FACES } from "../src/games/typeset/engine/faces";
import { CHARSET_POOL, FACES_POOL } from "../src/games/typeset/engine/pool";
import { TUTORIAL_BOARDS } from "../src/games/typeset/engine/tutorial";

const pairs = new Set<string>();
for (const e of CHARSET_POOL) for (const c of e.chars) pairs.add(JSON.stringify([e.face, c.char]));
for (const e of FACES_POOL) for (const f of e.faces) pairs.add(JSON.stringify([f, e.char.char]));
for (const b of TUTORIAL_BOARDS) for (const g of b.glyphs) pairs.add(JSON.stringify([g.face, g.char]));

console.log(
  JSON.stringify({
    faces: Object.fromEntries(Object.values(FACES).map((f) => [f.id, { family: f.googleFamily, weight: f.weight }])),
    // The hub-card preview's glyphs, baked into their own tiny file.
    preview: CHARSET_POOL[0].chars.map((c) => [CHARSET_POOL[0].face, c.char]),
    glyphs: [...pairs].map((p) => JSON.parse(p) as [string, string]).sort(),
  }),
);
