import { lazy } from "react";
import type { GameDefinition } from "../types";
import { BOARD_KINDS, dailyBoard } from "./engine/schedule";
import { ARCHIVE_EPOCH, isDaySolved, loadBoardRecord } from "./state/persistence";
import { TypesetPreview } from "./ui/TypesetPreview";
import { TypesetStatus } from "./ui/TypesetStatus";

export const typeset: GameDefinition = {
  id: "typeset",
  name: "Typeset",
  tagline: "Set, in type.",
  themeColor: "var(--color-accent)",
  Preview: TypesetPreview,
  Status: TypesetStatus,
  // Two boards a day; the game is done when both are solved.
  solvedToday: (today) => isDaySolved(today),
  roundupEntry: async (today) => {
    // Records, not the version-sensitive load, so this agrees with solvedToday.
    const boards = await Promise.all(BOARD_KINDS.map((b) => loadBoardRecord(today, b)));
    if (!boards.every((b) => b?.solved === true)) return null;
    return {
      emoji: "🖋️",
      name: "Typeset",
      unit: "sets",
      levels: BOARD_KINDS.map((kind, i) => ({
        label: dailyBoard(today, kind).label,
        value: boards[i]!.found.length,
        elapsedMs: boards[i]!.elapsedMs,
        hints: boards[i]!.hints ?? 0,
      })),
      elapsedMs: boards.reduce((ms, b) => ms + (b?.elapsedMs ?? 0), 0),
      hints: boards.reduce((n, b) => n + (b?.hints ?? 0), 0),
    };
  },
  // Days before the game existed count as done, so the cross-game streak
  // isn't broken by a puzzle nobody could play.
  solvedOn: async (dateKey) => dateKey < ARCHIVE_EPOCH || isDaySolved(dateKey),
  Page: lazy(() => import("./ui/TypesetPage")),
  extraRoutes: [
    { path: "tutorial", Page: lazy(() => import("./ui/TutorialPage")) },
    { path: "practice", Page: lazy(() => import("./ui/PracticePage")) },
    { path: "archive", Page: lazy(() => import("./ui/ArchivePage")) },
    { path: "stats", Page: lazy(() => import("./ui/TrendsPage")) },
    { path: "archive/:dateKey", Page: lazy(() => import("./ui/ArchivePlayPage")) },
  ],
  accentLevel: "typeset",
  newUntil: "2026-10-21",
  secondaryActions: [
    { label: "Practice", path: "practice" },
    { label: "Archive", path: "archive" },
    { label: "Stats", path: "stats" },
    { label: "Tutorial", path: "tutorial" },
  ],
};
