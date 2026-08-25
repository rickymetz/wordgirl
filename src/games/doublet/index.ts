import { lazy } from "react";
import type { GameDefinition } from "../types";
import { capitalize } from "../../lib/roundup";
import { DIFFICULTIES } from "./engine/types";
import { isDaySolved, loadDailyProgress } from "./state/persistence";
import { DoubletPreview } from "./ui/DoubletPreview";
import { DoubletStatus } from "./ui/DoubletStatus";

export const doublet: GameDefinition = {
  id: "doublet",
  name: "Doublet",
  tagline: "Place the tiles. Spell the words.",
  themeColor: "var(--color-accent)",
  Preview: DoubletPreview,
  Status: DoubletStatus,
  // Three boards a day; the game is done when every one is solved.
  solvedToday: async (today) => {
    const boards = await Promise.all(
      DIFFICULTIES.map((d) =>
        loadDailyProgress(today, d),
      ),
    );
    return boards.every((b) => b?.solved === true);
  },
  roundupEntry: async (today) => {
    const boards = await Promise.all(
      DIFFICULTIES.map((d) => loadDailyProgress(today, d)),
    );
    if (!boards.every((b) => b?.solved === true)) return null;
    // One level per board (Easy/Medium/Hard); summed time and hints.
    const elapsedMs = boards.reduce((ms, b) => ms + (b?.elapsedMs ?? 0), 0);
    const hints = boards.reduce((n, b) => n + (b?.hints ?? 0), 0);
    return {
      emoji: "👯‍♂️",
      name: "Doublet",
      unit: "pieces",
      levels: DIFFICULTIES.map((d, i) => ({
        label: capitalize(d),
        value: boards[i]!.placed.length,
        elapsedMs: boards[i]!.elapsedMs,
      })),
      elapsedMs,
      hints,
    };
  },
  solvedOn: isDaySolved,
  Page: lazy(() => import("./ui/DoubletPage")),
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
  accentLevel: "doublet",
  secondaryActions: [
    { label: "Practice", path: "practice" },
    { label: "Archive", path: "archive" },
    { label: "Stats", path: "stats" },
    { label: "Tutorial", path: "tutorial" },
  ],
};
