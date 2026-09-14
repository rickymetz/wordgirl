import { seededRandom } from "./random";
import { previousDateKey, localDateKey } from "./date";
import { DICT_VERSION } from "./words/dictionary";

/**
 * Demo history for previewing full archive/stats pages: visiting any
 * page with ?demo-history writes ~6 weeks of plausible solved days for
 * all five games into THIS browser's localStorage, then reloads with
 * the param stripped (main.tsx owns the trigger).
 *
 * Only ever a visitor's own local data, and it REFUSES to touch a
 * browser that already holds real day saves unless the param's value
 * is "replace" — a shared demo link must not cost somebody a streak.
 *
 * Every seeded save carries puzzleKey "demo-history", which can never
 * equal a real puzzle's fingerprint: archive and stats pages read the
 * records as normal (puzzleKey present, so nothing shows as stale),
 * while opening a day rejects the save on the key mismatch and starts
 * a clean real board — fake words can never hydrate into real play.
 * Dates end YESTERDAY, so today's puzzles stay genuinely unplayed.
 *
 * Shapes mirror each game's DailyProgress/stats interfaces by hand;
 * they are display-only (see above), so a drifted field costs a chart
 * gap, not a corrupted game.
 */

const DEMO_KEY = "demo-history";
const DAYS = 42;

const ns = (game: string) => `wg:v1:local:${game}:`;

function put(game: string, key: string, value: unknown): void {
  localStorage.setItem(ns(game) + key, JSON.stringify(value));
}

function hasRealHistory(): boolean {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) ?? "";
    if (!/^wg:v1:local:[a-z]+:daily:/.test(key)) continue;
    if (!(localStorage.getItem(key) ?? "").includes(DEMO_KEY)) return true;
  }
  return false;
}

/** Yesterday back to yesterday-N: [oldest … newest]. */
function dateSpan(): string[] {
  const out: string[] = [];
  let d = previousDateKey(localDateKey());
  for (let i = 0; i < DAYS; i++) {
    out.unshift(d);
    d = previousDateKey(d);
  }
  return out;
}

export function seedDemoHistory(replace: boolean): boolean {
  if (!replace && hasRealHistory()) {
    console.warn(
      "demo-history: this browser already has real progress — refusing. " +
        "Use ?demo-history=replace to overwrite it.",
    );
    return false;
  }

  const rng = seededRandom(DEMO_KEY);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
  const int = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
  const minutes = (lo: number, hi: number) =>
    int(lo * 60_000, hi * 60_000);
  const fakeWord = (len: number) =>
    Array.from({ length: len }, () => pick([..."aeiourstlnm"])).join("");
  const hour = () => pick([7, 8, 8, 9, 12, 13, 17, 19, 21, 22, 22, 23]);

  const dates = dateSpan();
  // Skip ~1 day in 7 so the charts show honest gaps — but keep the
  // last 9 days unbroken so the current streak reads live.
  const played = dates.filter(
    (_d, i) => i >= dates.length - 9 || rng() > 0.14,
  );
  const last = played[played.length - 1];

  // Streaks over the generated sequence (a day counts when played).
  const playedSet = new Set(played);
  let best = 0;
  let run = 0;
  for (const d of dates) {
    run = playedSet.has(d) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const streakBase = {
    played: played.length,
    solved: played.length,
    currentStreak: run,
    bestStreak: best,
    lastSolvedDate: last,
  };
  const dayBase = (dateKey: string, elapsedMs: number) => ({
    dateKey,
    dictVersion: DICT_VERSION,
    puzzleKey: DEMO_KEY,
    solved: true,
    elapsedMs,
    statsRecorded: true,
    sessions: int(1, 2),
    solvedHour: hour(),
  });

  // — Polygram: one board, level reached = longest word length.
  {
    let totalWords = 0;
    let bestTime: number | null = null;
    for (const d of played) {
      const level = int(5, 8);
      const words: string[] = [];
      for (let n = 3; n <= level; n++) {
        for (let i = 0; i < int(2, 4); i++) words.push(fakeWord(n));
      }
      totalWords += words.length;
      const elapsedMs = minutes(6, 28);
      bestTime = bestTime === null ? elapsedMs : Math.min(bestTime, elapsedMs);
      put("polygram", `daily:${d}`, {
        ...dayBase(d, elapsedMs),
        foundWords: words,
        revealed: {},
        completed: true,
        requiredWords: words.length,
        ...(rng() < 0.2 && { skippedLevels: [int(4, 6)] }),
      });
    }
    put("polygram", "stats", {
      ...streakBase,
      completed: played.length,
      lastCompletedDate: last,
      totalWords,
    });
  }

  // — Crosshatch: two boards a day (normal keys bare, hard prefixed).
  {
    let totalWords = 0;
    for (const d of played) {
      for (const level of ["normal", "hard"] as const) {
        const count = level === "normal" ? int(9, 13) : int(11, 15);
        totalWords += count;
        put(
          "crosshatch",
          level === "normal" ? `daily:${d}` : `daily:hard:${d}`,
          {
            ...dayBase(d, minutes(4, 15)),
            level,
            foundWords: Array.from({ length: count }, () =>
              fakeWord(int(3, 6)),
            ),
            grid: {},
            revealed: {},
            totalWords: count,
            statsWords: count,
            invalids: int(0, 4),
          },
        );
      }
    }
    put("crosshatch", "stats", { ...streakBase, totalWords });
  }

  // — Pierglass: rows against par.
  {
    let glyphRows = 0;
    let parSolves = 0;
    let bestTimeMs: number | null = null;
    for (const d of played) {
      const parRows = int(2, 3);
      const over = pick([0, 0, 0, 1, 1, 2]);
      const glyphs = rng() < 0.35 ? 1 : 0;
      glyphRows += glyphs;
      if (over === 0) parSolves += 1;
      const elapsedMs = minutes(2, 12);
      bestTimeMs =
        bestTimeMs === null ? elapsedMs : Math.min(bestTimeMs, elapsedMs);
      put("pierglass", `daily:${d}`, {
        ...dayBase(d, elapsedMs),
        rows: Array.from({ length: parRows + over }, () =>
          fakeWord(int(2, 4)),
        ),
        parRows,
        glyphRows: glyphs,
        hints: rng() < 0.25 ? 1 : 0,
        takeBacks: int(0, 3),
        invalids: int(0, 2),
      });
    }
    put("pierglass", "stats", {
      ...streakBase,
      bestTimeMs,
      glyphRows,
      parSolves,
    });
  }

  // — Doublet: three boards a day.
  {
    for (const d of played) {
      for (const diff of ["easy", "medium", "hard"] as const) {
        put("doublet", `daily:${diff}:${d}`, {
          ...dayBase(d, minutes(2, 9)),
          difficulty: diff,
          placed: [],
          foundWords: [],
          moves: int(6, 18),
          rotations: int(0, 6),
          removals: int(0, 5),
          invalidBoards: int(0, 3),
          hints: rng() < 0.2 ? 1 : 0,
        });
      }
    }
    put("doublet", "stats", { ...streakBase });
  }

  // — Serpentine: haiku + poem, path length = cells.
  {
    let bestTimeHaiku: number | null = null;
    let bestTimePoem: number | null = null;
    for (const d of played) {
      for (const diff of ["haiku", "poem"] as const) {
        const len = diff === "haiku" ? int(14, 20) : int(26, 38);
        const elapsedMs = diff === "haiku" ? minutes(2, 7) : minutes(5, 16);
        if (diff === "haiku") {
          bestTimeHaiku =
            bestTimeHaiku === null
              ? elapsedMs
              : Math.min(bestTimeHaiku, elapsedMs);
        } else {
          bestTimePoem =
            bestTimePoem === null
              ? elapsedMs
              : Math.min(bestTimePoem, elapsedMs);
        }
        put("serpentine", `daily:${diff}:${d}`, {
          ...dayBase(d, elapsedMs),
          difficulty: diff,
          puzzleId: DEMO_KEY,
          cells: Array.from({ length: len }, (_, i) => ({ r: 0, c: i })),
          hints: rng() < 0.3 ? int(1, 2) : 0,
        });
      }
    }
    put("serpentine", "stats", { ...streakBase, bestTimeHaiku, bestTimePoem });
  }

  return true;
}
