import { lazy } from "react";
import type { GameDefinition } from "../types";
import { PolygramPreview } from "./ui/PolygramPreview";
import { PolygramStatus } from "./ui/PolygramStatus";

export const polygram: GameDefinition = {
  id: "polygram",
  name: "Polygram",
  tagline: "Spell your way from triangle to decagon.",
  themeColor: "var(--color-accent)",
  Preview: PolygramPreview,
  Status: PolygramStatus,
  Page: lazy(() => import("./ui/PolygramPage")),
  extraRoutes: [
    { path: "practice", Page: lazy(() => import("./ui/PracticePage")) },
    { path: "archive", Page: lazy(() => import("./ui/ArchivePage")) },
    {
      path: "archive/:dateKey",
      Page: lazy(() => import("./ui/ArchivePlayPage")),
    },
    { path: "scoreboard", Page: lazy(() => import("./ui/ScoreboardPage")) },
  ],
  primaryLabel: "Daily puzzle",
  secondaryActions: [
    {
      label: "Practice",
      path: "practice",
      description: "Unlimited random puzzles",
    },
    {
      label: "Archive",
      path: "archive",
      description: "Play past dailies",
    },
    {
      label: "Scoreboard",
      path: "scoreboard",
      description: "Times & scores",
    },
  ],
};
