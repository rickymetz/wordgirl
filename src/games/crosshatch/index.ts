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
    const elapsedMs = boards.reduce((ms, b) => ms + (b?.elapsedMs ?? 0), 0);
    const hints = boards.reduce(
      (n, b) =>
        n +
        Object.values(b?.revealed ?? {}).reduce((m, pos) => m + pos.length, 0),
      0,
    );
    // Multi-board days break out by level (banner sub-rows, inline in the
    // share); a lone pre-HARD_EPOCH board keeps the plain "N words" form.
    if (levels.length > 1) {
      return {
        emoji: "🧺",
        name: "Crosshatch",
        unit: "words",
        levels: levels.map((level, i) => ({
          label: capitalize(level),
          value: boards[i]!.foundWords.length,
          elapsedMs: boards[i]!.elapsedMs,
        })),
        elapsedMs,
        hints,
      };
    }
    return {
      emoji: "🧺",
      name: "Crosshatch",
      metric: `${boards[0]!.foundWords.length} words`,
      elapsedMs,
      hints,
    };
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
