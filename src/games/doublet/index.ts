import { lazy } from "react";
import type { GameDefinition } from "../types";
import { DoubletPreview } from "./ui/DoubletPreview";
import { DoubletStatus } from "./ui/DoubletStatus";

export const doublet: GameDefinition = {
  id: "doublet",
  name: "Doublet",
  tagline: "Place the tiles. Spell the words.",
  themeColor: "var(--color-accent)",
  Preview: DoubletPreview,
  Status: DoubletStatus,
  Page: lazy(() => import("./ui/DoubletPage")),
  extraRoutes: [
    { path: "practice", Page: lazy(() => import("./ui/PracticePage")) },
    { path: "archive", Page: lazy(() => import("./ui/ArchivePage")) },
    { path: "stats", Page: lazy(() => import("./ui/TrendsPage")) },
    {
      path: "archive/:dateKey",
      Page: lazy(() => import("./ui/ArchivePlayPage")),
    },
  ],
  accentLevel: "doublet",
  secondaryActions: [
    { label: "Practice", path: "practice" },
    { label: "Archive", path: "archive" },
    { label: "Stats", path: "stats" },
  ],
};
