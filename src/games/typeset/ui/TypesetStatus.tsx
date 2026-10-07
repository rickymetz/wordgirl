import { GameStatus } from "../../../components/GameStatus";
import { BOARD_KINDS } from "../engine/schedule";
import { displayStreak, loadDailyProgress, loadStats } from "../state/persistence";

/** Hub-card status: the DAY, which is two boards. */
export function TypesetStatus() {
  return (
    <GameStatus
      loadState={async (today) => {
        const boards = await Promise.all(BOARD_KINDS.map((b) => loadDailyProgress(today, b)));
        const solved = boards.filter((b) => b?.solved).length;
        if (solved === boards.length) return "Solved ✓";
        if (solved > 0) return `${solved}/${boards.length} boards`;
        return boards.some((b) => b && b.found.length > 0) ? "In progress" : null;
      }}
      loadStreak={async (today) => displayStreak(await loadStats(), today)}
    />
  );
}
