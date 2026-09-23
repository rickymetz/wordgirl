import { readFileSync } from "node:fs";
import { describe, it } from "vitest";
import { dateKeyRange } from "../../../lib/date";
import { parseDictionary } from "../../../lib/words/dictionary";
import { anagramFamilies } from "./families";
import type { Difficulty } from "./generator";
import { MAX_GRIDS, dailyPuzzle, generateForFamily } from "./generator";

/**
 * The seed-pool and difficulty measurements behind DESIGN.md. Slow, so it
 * only runs on request:
 *   MEASURE=1 npx vitest run src/games/sixfold/engine/measure
 */
const dict = parseDictionary(
  readFileSync(new URL("../../../lib/words/dictionary.txt", import.meta.url), "utf8"),
);
const SEEDS = ["m:0", "m:1", "m:2"];
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};

describe.runIf(process.env.MEASURE)("sixfold measurements", () => {
  it("every family, every difficulty", () => {
    const families = anagramFamilies(dict);
    for (const difficulty of Object.keys(MAX_GRIDS) as Difficulty[]) {
      const rows: { givens: number; pre: number; empties: number; clue: boolean }[] = [];
      const dead: string[] = [];
      for (const f of families) {
        const hits = SEEDS.map((s) => generateForFamily(dict, f, s, difficulty)).filter(
          (a) => a !== null,
        );
        if (!hits.length) dead.push(f.words.join("/"));
        for (const h of hits) {
          rows.push({
            givens: h.puzzle.givens.length,
            pre: h.preStall,
            empties: h.empties,
            clue: h.clueNeeded,
          });
        }
      }
      console.log(
        `${difficulty.padEnd(6)} viable ${families.length - dead.length}/${families.length}` +
          ` · givens median ${median(rows.map((r) => r.givens))} (${Math.min(...rows.map((r) => r.givens))}-${Math.max(...rows.map((r) => r.givens))})` +
          ` · sudoku places ${median(rows.map((r) => r.pre))} of ${median(rows.map((r) => r.empties))} before the stall` +
          ` · clue needed ${rows.filter((r) => r.clue).length}/${rows.length}` +
          (dead.length ? ` · dead: ${dead.join(", ")}` : ""),
      );
    }
  }, 900_000);

  it("a quarter of dailies", () => {
    const days = dateKeyRange("2026-10-01", "2026-12-31");
    const t0 = Date.now();
    const by: Record<string, number[]> = {};
    for (const d of days) {
      const a = dailyPuzzle(dict, d);
      (by[a.difficulty] ??= []).push(a.preStall / a.empties);
    }
    console.log(
      `${days.length} dailies in ${Date.now() - t0}ms · share of empties sudoku fills pre-stall: ` +
        Object.entries(by)
          .map(([k, v]) => `${k} ${Math.round(median(v) * 100)}%`)
          .join(" · "),
    );
  }, 900_000);
});
