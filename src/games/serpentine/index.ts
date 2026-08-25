import { lazy } from "react";
import type { GameDefinition } from "../types";
import { loadDailyProgress } from "./state/persistence";
import { SerpentinePreview } from "./ui/SerpentinePreview";
import { SerpentineStatus } from "./ui/SerpentineStatus";

export const serpentine: GameDefinition = {
  id: "serpentine",
  name: "Serpentine",
  tagline: "One continuous line.",
  themeColor: "var(--color-accent)",
  Preview: SerpentinePreview,
  Status: SerpentineStatus,
  // Two boards a day; the game is done when both are solved.
  solvedToday: async (today) => {
    const boards = await Promise.all([
      loadDailyProgress("haiku", today),
      loadDailyProgress("poem", today),
    ]);
    return boards.every((b) => b?.solved === true);
  },
  roundupEntry: async (today) => {
    const boards = await Promise.all([
      loadDailyProgress("haiku", today),
      loadDailyProgress("poem", today),
    ]);
    if (!boards.every((b) => b?.solved === true)) return null;
    // Letters traced across both boards, and their summed play time.
    const letters = boards.reduce((n, b) => n + (b?.cells.length ?? 0), 0);
    const elapsedMs = boards.reduce((ms, b) => ms + (b?.elapsedMs ?? 0), 0);
    return { emoji: "🐍", name: "Serpentine", metric: `${letters} letters`, elapsedMs };
  },
  Page: lazy(() => import("./ui/SerpentinePage")),
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
  accentLevel: "serpentine",
  secondaryActions: [
    { label: "Practice", path: "practice" },
    { label: "Archive", path: "archive" },
    { label: "Stats", path: "stats" },
    { label: "Tutorial", path: "tutorial" },
  ],
};
