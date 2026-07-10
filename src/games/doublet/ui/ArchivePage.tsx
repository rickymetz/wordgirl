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
  type DoubletStats,
} from "../state/persistence";

const config: GameArchiveConfig<ArchivedDay, DoubletStats> = {
  gameId: "doublet",
  accent: "doublet",
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
      label: "Win %",
      value: stats.played > 0
        ? `${Math.round((stats.solved / stats.played) * 100)}%`
        : "—",
    },
    { label: "Unsolved", value: stats.played - stats.solved },
  ],
  // A day is done when ALL THREE boards are — matching the hub
  // card's "All solved".
  isDone: (day) => day.solvedCount === 3,
  rowStatus: (_dateKey, day) => {
    const stale = day.stale ? " · older words" : "";
    if (day.solvedCount === 3) {
      return { text: `All solved${stale}`, done: true };
    }
    if (day.solvedCount > 0) {
      return { text: `${day.solvedCount}/3 solved${stale}`, done: false };
    }
    return {
      text: day.stale ? "Not finished · older words" : "In progress",
      done: false,
    };
  },
};

export default function ArchivePage() {
  return <GameArchive config={config} />;
}
