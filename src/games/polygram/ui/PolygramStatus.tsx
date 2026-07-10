import { GameStatus } from "../../../components/GameStatus";
import {
  displayStreak,
  loadDailyProgress,
  loadStats,
} from "../state/persistence";

/** Hub-card status: today's date plus play state (shared GameStatus). */
export function PolygramStatus() {
  return (
    <GameStatus
      loadState={async (today) => {
        const daily = await loadDailyProgress(today);
        if (daily?.completed) return "Solved ✓";
        return daily && daily.foundWords.length > 0 ? "In progress" : null;
      }}
      loadStreak={async (today) => displayStreak(await loadStats(), today)}
    />
  );
}
