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
  ],
  secondaryActions: [{ label: "Practice", path: "practice" }],
};
