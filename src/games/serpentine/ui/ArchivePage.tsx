import {
  GameArchive,
  type GameArchiveConfig,
} from "../../../components/GameArchive";
import { formatDuration } from "../../../lib/date";
import {
  ARCHIVE_EPOCH,
  displayStreak,
  loadAllDailyProgress,
  loadStats,
  type ArchivedDay,
  type SerpentineStats,
} from "../state/persistence";

const config: GameArchiveConfig<ArchivedDay, SerpentineStats> = {
  gameId: "serpentine",
  accent: "serpentine",
  epoch: ARCHIVE_EPOCH,
  loadAllDays: loadAllDailyProgress,
  loadStats,
  hasPlayed: (stats) => stats.played > 0,
  statTiles: (stats) => [
    { label: "Streak", value: displayStreak(stats) },
    { label: "Best streak", value: stats.bestStreak },
    { label: "Solved", value: stats.solved },
    { label: "Played", value: stats.played },
    {
      label: "Best (easy)",
      value:
        stats.bestTimeEasy === null
          ? "---"
          : formatDuration(stats.bestTimeEasy),
    },
    {
      label: "Best (hard)",
      value:
        stats.bestTimeHard === null
          ? "---"
          : formatDuration(stats.bestTimeHard),
    },
  ],
  isDone: (day) => day.solved,
  rowStatus: (_dateKey, day) => {
    if (!day.solved) {
      if (day.stale) return { text: "Not finished . older words", done: false };
      return {
        text: `In progress . ${day.cells.length} cells`,
        done: false,
      };
    }
    return {
      text: `Solved${day.stale ? " . older words" : ""}`,
      done: true,
    };
  },
};

export default function ArchivePage() {
  return <GameArchive config={config} />;
}
