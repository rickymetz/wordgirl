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
  accentLevel: "serpentine",
  secondaryActions: [],
};
