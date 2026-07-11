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
      label: "Best (haiku)",
      value:
        stats.bestTimeHaiku === null
          ? "---"
          : formatDuration(stats.bestTimeHaiku),
    },
    {
      label: "Best (poem)",
      value:
        stats.bestTimePoem === null
          ? "---"
          : formatDuration(stats.bestTimePoem),
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
