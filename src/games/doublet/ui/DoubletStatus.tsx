import { GameStatus } from "../../../components/GameStatus";
import {
  displayStreak,
  loadDailyProgress,
  loadStats,
} from "../state/persistence";

/** Hub-card status: today's date plus play state (shared GameStatus).
 * Doublet has three boards a day, so the state line counts them. */
export function DoubletStatus() {
  return (
    <GameStatus
      loadState={async (today) => {
        const [easy, medium, hard] = await Promise.all([
          loadDailyProgress(today, "easy"),
          loadDailyProgress(today, "medium"),
          loadDailyProgress(today, "hard"),
        ]);
        const boards = [easy, medium, hard];
        const solved = boards.filter((p) => p?.solved).length;
        if (solved === 3) return "All solved";
        if (solved > 0) return `${solved}/3 solved`;
        const started = boards.some((p) => p && p.placed.length > 0);
        return started ? "In progress" : null;
      }}
      loadStreak={async (today) => displayStreak(await loadStats(), today)}
    />
  );
}
