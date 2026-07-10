import {
  GameArchive,
  type GameArchiveConfig,
} from "../../../components/GameArchive";
import {
  ARCHIVE_EPOCH,
  displayStreak,
  loadAllDailyProgress,
  loadStats,
  type ArchivedDay,
  type TilewordStats,
} from "../state/persistence";

const config: GameArchiveConfig<ArchivedDay, TilewordStats> = {
  gameId: "tileword",
  accent: "tileword",
  epoch: ARCHIVE_EPOCH,
  loadAllDays: loadAllDailyProgress,
  loadStats,
  hasPlayed: (stats) => stats.played > 0,
  statTiles: (stats) => [
    { label: "Streak", value: displayStreak(stats) },
    { label: "Best streak", value: stats.bestStreak },
    { label: "Solved", value: stats.solved },
    { label: "Played", value: stats.played },
  ],
  isDone: (day) => day.solved,
  rowStatus: (_dateKey, day) => ({
    text: day.solved
      ? `Solved${day.stale ? " · older words" : ""}`
      : `In progress · ${day.placed.length} placed`,
    done: day.solved,
  }),
};

export default function ArchivePage() {
  return <GameArchive config={config} />;
}
