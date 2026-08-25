import { lazy } from "react";
import type { GameDefinition } from "../types";
import { isDaySolved, levelsFor, loadDailyProgress } from "./state/persistence";
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
    const boards = await Promise.all(
      levelsFor(today).map((level) => loadDailyProgress(today, level)),
    );
    if (!boards.every((b) => b?.solved === true)) return null;
    // The day is both boards, so the roundup sums them — a single-board
    // count would undersell a two-board day.
    const words = boards.reduce((n, b) => n + (b?.foundWords.length ?? 0), 0);
    const elapsedMs = boards.reduce((ms, b) => ms + (b?.elapsedMs ?? 0), 0);
    return { emoji: "🧺", name: "Crosshatch", metric: `${words} words`, elapsedMs };
  },
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
