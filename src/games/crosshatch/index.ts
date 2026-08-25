import { lazy } from "react";
import type { GameDefinition } from "../types";
import { capitalize } from "../../lib/roundup";
import {
  isDaySolved,
  levelsFor,
  loadBoardRecord,
} from "./state/persistence";
import { CrosshatchPreview } from "./ui/CrosshatchPreview";
import { CrosshatchStatus } from "./ui/CrosshatchStatus";

export const crosshatch: GameDefinition = {
  id: "crosshatch",
  name: "Crosshatch",
  tagline: "Every way the words fit.",
  themeColor: "var(--color-accent)",
  Preview: CrosshatchPreview,
  Status: CrosshatchStatus,
  // Two boards a day; the game is done when both are solved.
  solvedToday: (today) => isDaySolved(today),
  roundupEntry: async (today) => {
    // Records, not the version-sensitive load, so this agrees with
    // solvedToday/solvedDates (see loadBoardRecord).
    const levels = levelsFor(today);
    const boards = await Promise.all(
      levels.map((level) => loadBoardRecord(today, level)),
    );
    if (!boards.every((b) => b?.solved === true)) return null;
    // Per level ("Normal 12 · Hard 13") when the day has more than one
    // board, so the roundup shows each level instead of one merged count;
    // a lone pre-HARD_EPOCH board keeps the plain "N words" form.
    const metric =
      levels.length > 1
        ? levels
            .map((level, i) => `${capitalize(level)} ${boards[i]!.foundWords.length}`)
            .join(" · ")
        : `${boards[0]!.foundWords.length} words`;
    const elapsedMs = boards.reduce((ms, b) => ms + (b?.elapsedMs ?? 0), 0);
    const hints = boards.reduce(
      (n, b) =>
        n +
        Object.values(b?.revealed ?? {}).reduce((m, pos) => m + pos.length, 0),
      0,
    );
    return { emoji: "🧺", name: "Crosshatch", metric, elapsedMs, hints };
  },
  solvedOn: isDaySolved,
  Page: lazy(() => import("./ui/CrosshatchPage")),
  extraRoutes: [
    { path: "tutorial", Page: lazy(() => import("./ui/TutorialPage")) },
    { path: "practice", Page: lazy(() => import("./ui/PracticePage")) },
    { path: "archive", Page: lazy(() => import("./ui/ArchivePage")) },
    { path: "stats", Page: lazy(() => import("./ui/TrendsPage")) },
    {
      path: "archive/:dateKey",
      Page: lazy(() => import("./ui/ArchivePlayPage")),
    },
  ],
  // Tiffany teal — the calm end of the palette for the deep-think game.
  accentLevel: "crosshatch",
  secondaryActions: [
    { label: "Practice", path: "practice" },
    { label: "Archive", path: "archive" },
    { label: "Stats", path: "stats" },
    { label: "Tutorial", path: "tutorial" },
  ],
};
