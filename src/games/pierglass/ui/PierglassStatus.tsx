import { GameStatus } from "../../../components/GameStatus";
import {
  displayStreak,
  loadDailyProgress,
  loadStats,
} from "../state/persistence";

/** Hub-card status: today's date plus play state (shared GameStatus). */
export function PierglassStatus() {
  return (
    <GameStatus
      loadState={async (today) => {
        const daily = await loadDailyProgress(today);
        if (daily?.solved) return "Solved ✓";
        return daily && daily.rows.length > 0 ? "In progress" : null;
      }}
      loadStreak={async (today) => displayStreak(await loadStats(), today)}
    />
  );
}
