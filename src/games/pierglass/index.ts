import { lazy } from "react";
import type { GameDefinition } from "../types";
import { loadDailyProgress } from "./state/persistence";
import { PierglassPreview } from "./ui/PierglassPreview";
import { PierglassStatus } from "./ui/PierglassStatus";

export const pierglass: GameDefinition = {
  id: "pierglass",
  name: "Pierglass",
  tagline: "Every word, a reflection.",
  themeColor: "var(--color-accent)",
  Preview: PierglassPreview,
  Status: PierglassStatus,
  solvedToday: async (today) =>
    (await loadDailyProgress(today))?.solved === true,
  Page: lazy(() => import("./ui/PierglassPage")),
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
  // Fuchsia — clearly its own game beside Polygram red, Crosshatch teal.
  accentLevel: "pierglass",
  secondaryActions: [
    { label: "Practice", path: "practice" },
    { label: "Archive", path: "archive" },
    { label: "Stats", path: "stats" },
    { label: "Tutorial", path: "tutorial" },
  ],
};
