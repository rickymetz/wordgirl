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
        const [haiku, poem] = await Promise.all([
          loadDailyProgress("haiku", today),
          loadDailyProgress("poem", today),
        ]);
        const haikuSolved = haiku?.solved;
        const poemSolved = poem?.solved;
        if (haikuSolved && poemSolved) return "All solved";
        if (haikuSolved) return "Haiku solved";
        if (poemSolved) return "Poem solved";
        const started =
          (haiku && haiku.cells.length > 0) ||
          (poem && poem.cells.length > 0);
        return started ? "In progress" : null;
      }}
      loadStreak={async (today) => displayStreak(await loadStats(), today)}
    />
  );
}
