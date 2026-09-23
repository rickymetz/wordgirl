import { seededRandom } from "./random";
import { previousDateKey, localDateKey } from "./date";
import { DICT_VERSION } from "./words/dictionary";
import { createGameStore } from "./storage/createGameStore";
import { createLocalStorageAdapter } from "./storage/localStorageAdapter";
import { BACKUP_PREFIX } from "./backup";
import { levelsFor } from "../games/crosshatch/state/persistence";
import { ARCHIVE_EPOCH as SIXFOLD_EPOCH } from "../games/sixfold/state/persistence";

/**
 * Demo history for previewing full archive/stats pages: visiting any
 * page with ?demo-history writes ~6 weeks of plausible progress for
 * all six games into THIS browser's storage, then reloads with the
 * param stripped (main.tsx owns the trigger, and only dev and preview
 * builds compile the trigger in at all).
 *
 * Only ever a visitor's own local data, and it REFUSES to touch a
 * browser that already holds real progress — day saves whose
 * puzzleKey isn't ours, or lifetime stats with no demo saves beside
 * them — unless the param's value is "replace" AND the visitor
 * confirms the overwrite. A shared demo link must not cost somebody a
 * streak. If the scan itself fails, it refuses too: "couldn't check"
 * must never resolve to "assume it's fine to overwrite".
 *
 * Every seeded save carries puzzleKey "demo-history", which can never
 * equal a real puzzle's fingerprint: archive and stats pages read the
 * records as normal (puzzleKey present, so nothing shows as stale),
 * while opening a day rejects the save on the key mismatch and starts
 * a clean real board — fake words can never hydrate into real play.
 * Dates end YESTERDAY, so today's puzzles stay genuinely unplayed.
 *
 * Writes go through each game's store but NOT through
 * saveDailyProgress — the multi-tab and solved-final guards protect a
 * live run, and there is none: at write time the seeder owns the
 * whole namespace (it clears daily:/stats first, so re-seeding never
 * leaves stragglers from a previous span of dates).
 *
 * Shapes mirror each game's DailyProgress/stats interfaces by hand;
 * they are display-only (see above), so a drifted field costs a chart
 * gap, not a corrupted game.
 */

const DEMO_KEY = "demo-history";
const DAYS = 42;

export const GAME_IDS = [
  "polygram",
  "crosshatch",
  "pierglass",
  "doublet",
  "serpentine",
  "sixfold",
] as const;

/** Fake words render in archive word lists; nonsense is fine, these
 * particular strings the letter pool can spell are not. */
const BLOCKLIST = new Set([
  "anus",
  "arse",
  "arses",
  "slut",
  "sluts",
  "smut",
  "tit",
  "tits",
  "teat",
  "teats",
  "semen",
  "urine",
  "moron",
  "morons",
]);

interface ExistingScan {
  realSaves: number;
  demoSaves: number;
  statsPlayed: number;
}

/** Parse every day save rather than substring-matching raw storage:
 * a real save must never be misread as demo because a found word
 * happened to contain the marker text. */
async function scanExisting(): Promise<ExistingScan> {
  // The store adapter swallows storage failures into "empty" — right
  // for gameplay, exactly wrong here, where an unreadable browser must
  // refuse rather than scan as blank. A storage-blocked browser throws
  // on this property access itself; let it reach the caller's catch.
  void localStorage.length;
  const scan: ExistingScan = { realSaves: 0, demoSaves: 0, statsPlayed: 0 };
  for (const game of GAME_IDS) {
    const store = createGameStore(game);
    for (const key of await store.keys("daily:")) {
      const save = await store.get<{ puzzleKey?: string }>(key);
      if (!save || typeof save !== "object") continue;
      if (save.puzzleKey === DEMO_KEY) scan.demoSaves++;
      else scan.realSaves++;
    }
    const stats = await store.get<{ played?: number }>("stats");
    if (typeof stats?.played === "number") scan.statsPlayed += stats.played;
  }
  return scan;
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

export async function seedDemoHistory(replace: boolean): Promise<boolean> {
  let existing: ExistingScan;
  try {
    existing = await scanExisting();
  } catch (err) {
    console.warn("demo-history: could not read existing saves — refusing to write over unknown data.", err);
    return false;
  }
  const hasReal =
    existing.realSaves > 0 ||
    (existing.demoSaves === 0 && existing.statsPlayed > 0);
  if (hasReal) {
    if (!replace) {
      console.warn(
        "demo-history: this browser already has real progress — refusing. " +
          "Use ?demo-history=replace to overwrite it.",
      );
      return false;
    }
    if (
      !window.confirm(
        "Replace all saved progress on this device with demo data? This cannot be undone.",
      )
    ) {
      return false;
    }
  }

  // Own the namespace: drop every day save and stats blob first, so a
  // re-seed on a later date doesn't leave orphan days past the span.
  const writes: Promise<void>[] = [];
  for (const game of GAME_IDS) {
    const store = createGameStore(game);
    for (const key of await store.keys("daily:")) {
      writes.push(store.remove(key));
    }
    writes.push(store.remove("stats"));
  }
  await Promise.all(writes);
  writes.length = 0;

  const put = (game: string, key: string, value: unknown) =>
    writes.push(createGameStore(game).set(key, value));

  const rng = seededRandom(DEMO_KEY);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
  const int = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
  const minutes = (lo: number, hi: number) =>
    int(lo * 60_000, hi * 60_000);
  const fakeWord = (len: number): string => {
    for (let tries = 0; tries < 20; tries++) {
      const w = Array.from({ length: len }, () =>
        pick([..."aeiourstlnm"]),
      ).join("");
      if (!BLOCKLIST.has(w)) return w;
    }
    return "aeiou".slice(0, Math.max(2, Math.min(len, 5)));
  };
  const hour = () => pick([7, 8, 8, 9, 12, 13, 17, 19, 21, 22, 22, 23]);
  /** word -> hint-revealed positions, occasionally — an always-empty
   * map would chart the hints metric as a flat zero line. */
  const revealedFor = (words: string[], p: number) =>
    rng() < p && words.length > 0
      ? { [words[0]]: Array.from({ length: int(1, 2) }, (_, i) => i) }
      : {};

  const dates = dateSpan();
  // Skip ~1 day in 7 so the charts show honest gaps — but keep the
  // last 9 days unbroken so the current streak reads live.
  const played = dates.filter(
    (_d, i) => i >= dates.length - 9 || rng() > 0.14,
  );
  const last = played[played.length - 1];
  // A couple of the skipped days get UNSOLVED partial saves (Polygram
  // and Pierglass only) so the archive shows in-progress rows too.
  const partials = dates
    .filter((d, i) => i < dates.length - 9 && !played.includes(d))
    .slice(0, 2);

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
    for (const d of played) {
      const level = int(5, 8);
      const words: string[] = [];
      for (let n = 3; n <= level; n++) {
        for (let i = 0; i < int(2, 4); i++) words.push(fakeWord(n));
      }
      totalWords += words.length;
      put("polygram", `daily:${d}`, {
        ...dayBase(d, minutes(6, 28)),
        foundWords: words,
        revealed: revealedFor(words, 0.25),
        completed: true,
        requiredWords: words.length,
        ...(rng() < 0.2 && { skippedLevels: [int(4, 6)] }),
      });
    }
    for (const d of partials) {
      const words = [fakeWord(3), fakeWord(3), fakeWord(4)];
      put("polygram", `daily:${d}`, {
        ...dayBase(d, minutes(2, 6)),
        solved: false,
        solvedHour: undefined,
        foundWords: words,
        revealed: {},
        completed: false,
        requiredWords: words.length + int(6, 10),
      });
    }
    put("polygram", "stats", {
      ...streakBase,
      played: played.length + partials.length,
      completed: played.length,
      lastCompletedDate: last,
      totalWords,
    });
  }

  // — Crosshatch: normal board always; hard only on dates that HAVE
  //   one (levelsFor gates on HARD_EPOCH — a hard save on an earlier
  //   date would describe a board that never existed).
  {
    let totalWords = 0;
    for (const d of played) {
      for (const level of levelsFor(d)) {
        const count = level === "normal" ? int(9, 13) : int(11, 15);
        totalWords += count;
        const words = Array.from({ length: count }, () => fakeWord(int(3, 6)));
        put(
          "crosshatch",
          level === "normal" ? `daily:${d}` : `daily:hard:${d}`,
          {
            ...dayBase(d, minutes(4, 15)),
            level,
            foundWords: words,
            grid: {},
            revealed: revealedFor(words, 0.2),
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
    for (const d of partials) {
      put("pierglass", `daily:${d}`, {
        ...dayBase(d, minutes(1, 4)),
        solved: false,
        solvedHour: undefined,
        rows: [fakeWord(int(2, 3))],
        takeBacks: int(0, 1),
        invalids: int(0, 1),
      });
    }
    put("pierglass", "stats", {
      ...streakBase,
      played: played.length + partials.length,
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

  // — Sixfold: one board a day, and only from its launch
  //   (ARCHIVE_EPOCH) on.
  {
    const pairs = [
      ["listen", "silent"],
      ["badger", "barged"],
      ["hostel", "hotels"],
      ["angels", "angles"],
      ["antler", "rental"],
    ];
    let bestTimeMs: number | null = null;
    let hintFreeSolves = 0;
    for (const d of played) {
      // Nothing to seed before the game existed — seeded "history" there
      // would also mask the all-games streak's launch-day behavior.
      if (d < SIXFOLD_EPOCH) continue;
      const [cluedWord, hiddenWord] = pick(pairs);
      const elapsedMs = minutes(3, 14);
      const hints = rng() < 0.25 ? int(1, 3) : 0;
      if (hints === 0) hintFreeSolves++;
      bestTimeMs = bestTimeMs === null ? elapsedMs : Math.min(bestTimeMs, elapsedMs);
      put("sixfold", `daily:${d}`, {
        ...dayBase(d, elapsedMs),
        entries: cluedWord.repeat(6),
        revealed: Array.from({ length: hints }, (_, i) => i),
        filled: int(22, 27),
        hints,
        conflicts: rng() < 0.4 ? int(1, 4) : 0,
        cluedWord,
        hiddenWord,
      });
    }
    const seeded = played.filter((d) => d >= SIXFOLD_EPOCH).length;
    if (seeded > 0) {
      put("sixfold", "stats", {
        ...streakBase,
        played: seeded,
        solved: seeded,
        currentStreak: Math.min(run, seeded),
        bestStreak: Math.min(best, seeded),
        bestTimeMs,
        hintFreeSolves,
      });
    }
  }

  // Six weeks of "progress" would trip the backup reminder on the
  // first hub visit; demo data is not worth a nag to save it.
  writes.push(
    createLocalStorageAdapter().set(`${BACKUP_PREFIX}backup`, {
      lastSavedAt: new Date().toISOString(),
    }),
  );

  await Promise.all(writes);
  return true;
}
