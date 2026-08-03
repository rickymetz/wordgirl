import { lazy } from "react";
import type { GameDefinition } from "../types";
import { loadDailyProgress } from "./state/persistence";
import { PolygramPreview } from "./ui/PolygramPreview";
import { PolygramStatus } from "./ui/PolygramStatus";

export const polygram: GameDefinition = {
  id: "polygram",
  name: "Polygram",
  tagline: "Spell your way from triangle to decagon.",
  themeColor: "var(--color-accent)",
  Preview: PolygramPreview,
  Status: PolygramStatus,
  solvedToday: async (today) =>
    (await loadDailyProgress(today))?.completed === true,
  Page: lazy(() => import("./ui/PolygramPage")),
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
  // Every daily starts at the triangle — the hub wears its red.
  accentLevel: 3,
  secondaryActions: [
    { label: "Practice", path: "practice" },
    { label: "Archive", path: "archive" },
    { label: "Stats", path: "stats" },
    { label: "Tutorial", path: "tutorial" },
  ],
};
