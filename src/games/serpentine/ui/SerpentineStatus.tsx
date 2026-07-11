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
        let started = false;
        for (const diff of ["haiku", "poem"] as const) {
          const daily = await loadDailyProgress(diff, today);
          if (daily?.solved) return "Solved ✓";
          if (daily && daily.cells.length > 0) started = true;
        }
        return started ? "In progress" : null;
      }}
      loadStreak={async (today) => displayStreak(await loadStats(), today)}
    />
  );
}
