import { lazy } from "react";
import type { GameDefinition } from "../types";
import { loadDailyProgress } from "./state/persistence";
import { CrosshatchPreview } from "./ui/CrosshatchPreview";
import { CrosshatchStatus } from "./ui/CrosshatchStatus";

export const crosshatch: GameDefinition = {
  id: "crosshatch",
  name: "Crosshatch",
  tagline: "Every way the words fit.",
  themeColor: "var(--color-accent)",
  Preview: CrosshatchPreview,
  Status: CrosshatchStatus,
  solvedToday: async (today) =>
    (await loadDailyProgress(today))?.solved === true,
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
