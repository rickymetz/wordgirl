import { lazy } from "react";
import type { GameDefinition } from "../types";
import { SerpentinePreview } from "./ui/SerpentinePreview";
import { SerpentineStatus } from "./ui/SerpentineStatus";

export const serpentine: GameDefinition = {
  id: "serpentine",
  name: "Serpentine",
  tagline: "One continuous line.",
  themeColor: "var(--color-accent)",
  Preview: SerpentinePreview,
  Status: SerpentineStatus,
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
  ],
};
