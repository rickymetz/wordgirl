import { lazy } from "react";
import type { GameDefinition } from "../types";
import { BackwordsPreview } from "./ui/BackwordsPreview";
import { BackwordsStatus } from "./ui/BackwordsStatus";

export const backwords: GameDefinition = {
  id: "backwords",
  name: "Backwords",
  tagline: "Every word, a reflection.",
  themeColor: "var(--color-accent)",
  Preview: BackwordsPreview,
  Status: BackwordsStatus,
  Page: lazy(() => import("./ui/BackwordsPage")),
  extraRoutes: [
    { path: "practice", Page: lazy(() => import("./ui/PracticePage")) },
    { path: "archive", Page: lazy(() => import("./ui/ArchivePage")) },
    { path: "stats", Page: lazy(() => import("./ui/TrendsPage")) },
    {
      path: "archive/:dateKey",
      Page: lazy(() => import("./ui/ArchivePlayPage")),
    },
  ],
  // Fuchsia — clearly its own game beside Polygram red, Crosshatch teal.
  accentLevel: "backwords",
  secondaryActions: [
    { label: "Practice", path: "practice" },
    { label: "Archive", path: "archive" },
    { label: "Stats", path: "stats" },
  ],
};
