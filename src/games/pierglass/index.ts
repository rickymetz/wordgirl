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
  roundupEntry: async (today) => {
    const d = await loadDailyProgress(today);
    if (!d?.solved) return null;
    // Rows against par, the same yardstick the game's own share uses;
    // the ⭐️ is a share-only flourish, so the roundup states it plainly.
    const par =
      d.parRows === undefined
        ? ""
        : d.rows.length <= d.parRows
          ? " · par"
          : ` · par ${d.parRows}`;
    return {
      emoji: "🪞",
      name: "Pierglass",
      metric: `${d.rows.length} rows${par}`,
      elapsedMs: d.elapsedMs,
    };
  },
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
