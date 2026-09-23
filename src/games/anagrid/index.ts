import { lazy } from "react";
import type { GameDefinition } from "../types";
import { isDaySolved, loadDailyProgress } from "./state/persistence";
import { AnagridPreview } from "./ui/AnagridPreview";
import { AnagridStatus } from "./ui/AnagridStatus";

/** Working title — the name is still open (see DESIGN.md). */
export const anagrid: GameDefinition = {
  id: "anagrid",
  name: "Anagrid",
  tagline: "Sudoku, spelled.",
  themeColor: "var(--color-accent)",
  Preview: AnagridPreview,
  Status: AnagridStatus,
  solvedToday: async (today) => (await loadDailyProgress(today))?.solved === true,
  roundupEntry: async (today) => {
    const d = await loadDailyProgress(today);
    if (!d?.solved) return null;
    return {
      emoji: "🔠",
      name: "Anagrid",
      unit: "letters",
      value: d.filled ?? 0,
      elapsedMs: d.elapsedMs,
      hints: d.hints ?? 0,
    };
  },
  solvedOn: isDaySolved,
  Page: lazy(() => import("./ui/AnagridPage")),
  extraRoutes: [
    { path: "tutorial", Page: lazy(() => import("./ui/TutorialPage")) },
    { path: "archive", Page: lazy(() => import("./ui/ArchivePage")) },
    { path: "stats", Page: lazy(() => import("./ui/TrendsPage")) },
    { path: "archive/:dateKey", Page: lazy(() => import("./ui/ArchivePlayPage")) },
  ],
  // Indigo — the one hue the game palette lacked.
  accentLevel: "anagrid",
  // No Practice yet: deferred in the requirements interview.
  secondaryActions: [
    { label: "Archive", path: "archive" },
    { label: "Stats", path: "stats" },
    { label: "Tutorial", path: "tutorial" },
  ],
};
