import { readFileSync } from "node:fs";
import { describe, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import type { Geometry } from "./families";
import { anagramFamilies, pairings } from "./families";
import type { UniquenessProof } from "./generator";
import { generateForFamily, geometriesFor } from "./generator";
import { BOX_LAYOUT } from "./layouts";

/**
 * The seed-pool measurement behind DESIGN.md. Slow-ish, so it only
 * runs on request:
 *   MEASURE=1 npx vitest run src/games/anagrid/engine/measure
 * MEASURE=diagonal|cross forces one geometry for every family;
 * MEASURE_PROOF=open proves uniqueness without assuming the clue.
 */
const dict = parseDictionary(
  readFileSync(new URL("../../../lib/words/dictionary.txt", import.meta.url), "utf8"),
);

const PROOF = (process.env.MEASURE_PROOF === "open" ? "open" : "clue") as UniquenessProof;
const FORCED = ["diagonal", "cross"].includes(process.env.MEASURE ?? "")
  ? (process.env.MEASURE as Geometry)
  : undefined;
const SEEDS = ["m:0", "m:1", "m:2"];

describe.runIf(process.env.MEASURE)("anagrid seed pool", () => {
  it(`reports which families make word-dependent boards (proof: ${PROOF})`, () => {
    const families = anagramFamilies(dict);
    const rows: string[] = [];
    let viable = 0;
    for (const f of families) {
      const geometries = FORCED ? [FORCED] : geometriesFor(f);
      const hits = SEEDS.map((s) =>
        generateForFamily(dict, f, s, BOX_LAYOUT, PROOF, geometries),
      ).filter((a) => a !== null);
      if (hits.length) viable++;
      const givens = hits.map((h) => h.puzzle.givens.length);
      rows.push(
        [
          f.words.join("/").padEnd(24),
          (hits.length ? (hits[0].puzzle.col < 0 ? "diagonal" : "cross") : "-").padEnd(8),
          `diagonal pairings ${pairings(f, "diagonal").length}`,
          `boards ${hits.length}/${SEEDS.length}`,
          hits.length ? `givens ${givens.join(",")} rounds ${hits.map((h) => h.rounds).join(",")}` : "-",
        ].join("  "),
      );
    }
    console.log(rows.join("\n"));
    console.log(`families ${families.length} · viable ${viable} · dead ${families.length - viable}`);
  }, 600_000);
});
