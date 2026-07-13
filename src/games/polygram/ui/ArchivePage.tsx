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
  type PolygramStats,
} from "../state/persistence";

const config: GameArchiveConfig<ArchivedDay, PolygramStats> = {
  gameId: "polygram",
  // The game's cluster color: the hub card's triangle red.
  accent: 3,
  epoch: ARCHIVE_EPOCH,
  loadAllDays: loadAllDailyProgress,
  loadStats,
  hasPlayed: (stats) => stats.played > 0,
  statTiles: (stats) => [
    { label: "Streak", value: displayStreak(stats) },
    { label: "Best streak", value: stats.bestStreak },
    { label: "Solved", value: stats.completed },
    { label: "Played", value: stats.played },
    { label: "Points", value: stats.totalScore },
  ],
  isDone: (day) => day.completed,
  rowStatus: (_dateKey, day) => {
    if (!day.completed) {
      return { text: `In progress · ${day.score} pts`, done: false };
    }
    return {
      text: `${day.score} pts${
        Object.keys(day.revealed).length > 0 ? " · used hint" : ""
      }${day.stale ? " · older words" : ""}`,
      done: true,
    };
  },
};

/** Past daily puzzles: calendar mosaic + played days, newest first. */
export default function ArchivePage() {
  return <GameArchive config={config} />;
}
