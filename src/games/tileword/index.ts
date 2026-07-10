import { lazy } from "react";
import type { GameDefinition } from "../types";
import { TilewordPreview } from "./ui/TilewordPreview";
import { TilewordStatus } from "./ui/TilewordStatus";

export const tileword: GameDefinition = {
  id: "tileword",
  name: "Tileword",
  tagline: "Place the tiles. Spell the words.",
  themeColor: "var(--color-accent)",
  Preview: TilewordPreview,
  Status: TilewordStatus,
  Page: lazy(() => import("./ui/TilewordPage")),
  extraRoutes: [
    { path: "practice", Page: lazy(() => import("./ui/PracticePage")) },
    { path: "archive", Page: lazy(() => import("./ui/ArchivePage")) },
    {
      path: "archive/:dateKey",
      Page: lazy(() => import("./ui/ArchivePlayPage")),
    },
  ],
  accentLevel: "tileword",
  secondaryActions: [
    { label: "Practice", path: "practice" },
    { label: "Archive", path: "archive" },
  ],
};
