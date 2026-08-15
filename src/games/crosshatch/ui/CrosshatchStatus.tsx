import { GameStatus } from "../../../components/GameStatus";
import {
  displayStreak,
  levelsFor,
  loadDailyProgress,
  loadStats,
} from "../state/persistence";

/** Hub-card status: today's date plus play state (shared GameStatus). */
export function CrosshatchStatus() {
  return (
    <GameStatus
      loadState={async (today) => {
        // Two boards a day: the card reports the DAY, and says how far
        // through it you are rather than calling one board "in progress".
        const boards = await Promise.all(
          levelsFor(today).map((level) => loadDailyProgress(today, level)),
        );
        const solved = boards.filter((b) => b?.solved).length;
        if (solved === boards.length) return "Solved ✓";
        if (boards.length > 1 && solved > 0) {
          return `${solved}/${boards.length} boards`;
        }
        return boards.some((b) => b && b.foundWords.length > 0)
          ? "In progress"
          : null;
      }}
      loadStreak={async (today) => displayStreak(await loadStats(), today)}
    />
  );
}
