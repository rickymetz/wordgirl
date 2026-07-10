import { GameStatus } from "../../../components/GameStatus";
import {
  displayStreak,
  loadDailyProgress,
  loadStats,
} from "../state/persistence";

export function SerpentineStatus() {
  return (
    <GameStatus
      loadState={async (today) => {
        // Check if any difficulty is solved or in progress.
        for (const diff of ["easy", "medium", "hard"] as const) {
          const daily = await loadDailyProgress(diff, today);
          if (daily?.solved) return "Solved ✓";
          if (daily && daily.cells.length > 0)
            return "In progress";
        }
        return null;
      }}
      loadStreak={async (today) => displayStreak(await loadStats(), today)}
    />
  );
}
