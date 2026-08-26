import { lazy } from "react";
import type { GameDefinition } from "../types";
import { isDaySolved, loadDailyProgress } from "./state/persistence";
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
  roundupEntry: async (today) => {
    const d = await loadDailyProgress(today);
    if (!d?.completed) return null;
    // Older saves stored a bare count per word; newer ones a position list.
    const hints = Object.values(d.revealed).reduce<number>(
      (n, p) => n + (Array.isArray(p) ? p.length : p),
      0,
    );
    return {
      emoji: "🔻",
      name: "Polygram",
      unit: "words",
      value: d.foundWords.length,
      elapsedMs: d.elapsedMs,
      hints,
    };
  },
  solvedOn: isDaySolved,
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
