import type { Layout } from "./types";
import { N } from "./types";

/**
 * Region layouts, drawn as six rows of region letters (A-F). v1 ships
 * the classic 2×3 BOX layout only: every family made a word-dependent
 * box board in the seed-pool measurement, so the planned jigsaw
 * fallback had nothing to catch. Irregular layouts can join later for
 * variety — `isValidLayout` is the check they'll need.
 *
 * Seeds reference layouts by id. Never reorder or edit a shipped
 * layout — add a new id instead, or archived days regenerate onto a
 * different board.
 */
interface LayoutSource {
  id: string;
  rows: readonly string[];
}

function parseLayout({ id, rows }: LayoutSource): Layout {
  const regions: number[] = [];
  for (const row of rows) {
    for (const ch of row) regions.push(ch.charCodeAt(0) - 65);
  }
  return { id, regions };
}

export const BOX_LAYOUT: Layout = parseLayout({
  id: "box",
  rows: ["AAABBB", "AAABBB", "CCCDDD", "CCCDDD", "EEEFFF", "EEEFFF"],
});

export const ALL_LAYOUTS: readonly Layout[] = [BOX_LAYOUT];

export function layoutById(id: string): Layout | undefined {
  return ALL_LAYOUTS.find((l) => l.id === id);
}

/** Region sizes are all N and every region is one orthogonally connected piece. */
export function isValidLayout(layout: Layout): boolean {
  const { regions } = layout;
  if (regions.length !== N * N) return false;
  for (let r = 0; r < N; r++) {
    const cells = regions.flatMap((v, i) => (v === r ? [i] : []));
    if (cells.length !== N) return false;
    const seen = new Set([cells[0]]);
    const stack = [cells[0]];
    while (stack.length) {
      const c = stack.pop()!;
      const row = Math.floor(c / N);
      const col = c % N;
      const next = [
        row > 0 ? c - N : -1,
        row < N - 1 ? c + N : -1,
        col > 0 ? c - 1 : -1,
        col < N - 1 ? c + 1 : -1,
      ];
      for (const n of next) {
        if (n >= 0 && regions[n] === r && !seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
    if (seen.size !== N) return false;
  }
  return true;
}
