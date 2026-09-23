import { lazy } from "react";
import type { GameDefinition } from "../types";
import { ARCHIVE_EPOCH, isDaySolved, loadDayRecord } from "./state/persistence";
import { SixfoldPreview } from "./ui/SixfoldPreview";
import { SixfoldStatus } from "./ui/SixfoldStatus";

export const sixfold: GameDefinition = {
  id: "sixfold",
  name: "Sixfold",
  tagline: "Solve the square. Find the words.",
  themeColor: "var(--color-accent)",
  Preview: SixfoldPreview,
  Status: SixfoldStatus,
  // Records, not the version-sensitive load, so these agree with solvedOn
  // even after a dictionary bump mid-day.
  solvedToday: (today) => isDaySolved(today),
  roundupEntry: async (today) => {
    const d = await loadDayRecord(today);
    if (!d?.solved) return null;
    return {
      emoji: "🔠",
      name: "Sixfold",
      unit: "letters",
      // Letters the player placed: hint-filled cells don't count, so the
      // number says something about the solve, not just the board size.
      value: Math.max(0, (d.filled ?? 0) - (d.revealed?.length ?? 0)),
      elapsedMs: d.elapsedMs,
      hints: d.hints ?? 0,
    };
  },
  // Before Sixfold existed there was nothing to finish: those days count
  // as done, so the all-games streak (which walks back until some game
  // says no) doesn't reset for every player on launch day.
  solvedOn: async (dateKey) => dateKey < ARCHIVE_EPOCH || isDaySolved(dateKey),
  Page: lazy(() => import("./ui/SixfoldPage")),
  extraRoutes: [
    { path: "tutorial", Page: lazy(() => import("./ui/TutorialPage")) },
    { path: "practice", Page: lazy(() => import("./ui/PracticePage")) },
    { path: "archive", Page: lazy(() => import("./ui/ArchivePage")) },
    { path: "stats", Page: lazy(() => import("./ui/TrendsPage")) },
    { path: "archive/:dateKey", Page: lazy(() => import("./ui/ArchivePlayPage")) },
  ],
  // Launched 2026-09-23 (ARCHIVE_EPOCH): the hub card says "New" for two weeks.
  newUntil: "2026-10-07",
  // Indigo — the one hue the game palette lacked.
  accentLevel: "sixfold",
  secondaryActions: [
    { label: "Practice", path: "practice" },
    { label: "Archive", path: "archive" },
    { label: "Stats", path: "stats" },
    { label: "Tutorial", path: "tutorial" },
  ],
};
