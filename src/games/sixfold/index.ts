import { lazy } from "react";
import type { GameDefinition } from "../types";
import { isDaySolved, loadDailyProgress } from "./state/persistence";
import { SixfoldPreview } from "./ui/SixfoldPreview";
import { SixfoldStatus } from "./ui/SixfoldStatus";

export const sixfold: GameDefinition = {
  id: "sixfold",
  name: "Sixfold",
  tagline: "Solve the square. Find the words.",
  themeColor: "var(--color-accent)",
  Preview: SixfoldPreview,
  Status: SixfoldStatus,
  solvedToday: async (today) => (await loadDailyProgress(today))?.solved === true,
  roundupEntry: async (today) => {
    const d = await loadDailyProgress(today);
    if (!d?.solved) return null;
    return {
      emoji: "🔠",
      name: "Sixfold",
      unit: "letters",
      value: d.filled ?? 0,
      elapsedMs: d.elapsedMs,
      hints: d.hints ?? 0,
    };
  },
  solvedOn: isDaySolved,
  Page: lazy(() => import("./ui/SixfoldPage")),
  extraRoutes: [
    { path: "tutorial", Page: lazy(() => import("./ui/TutorialPage")) },
    { path: "practice", Page: lazy(() => import("./ui/PracticePage")) },
    { path: "archive", Page: lazy(() => import("./ui/ArchivePage")) },
    { path: "stats", Page: lazy(() => import("./ui/TrendsPage")) },
    { path: "archive/:dateKey", Page: lazy(() => import("./ui/ArchivePlayPage")) },
  ],
  // Indigo — the one hue the game palette lacked.
  accentLevel: "sixfold",
  secondaryActions: [
    { label: "Practice", path: "practice" },
    { label: "Archive", path: "archive" },
    { label: "Stats", path: "stats" },
    { label: "Tutorial", path: "tutorial" },
  ],
};
