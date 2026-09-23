import { GameArchive, type GameArchiveConfig } from "../../../components/GameArchive";
import { formatDuration } from "../../../lib/date";
import {
  ARCHIVE_EPOCH,
  displayStreak,
  loadAllDailyProgress,
  loadStats,
  type AnagridStats,
  type ArchivedDay,
} from "../state/persistence";

const config: GameArchiveConfig<ArchivedDay, AnagridStats> = {
  gameId: "anagrid",
  accent: "anagrid",
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
      label: "Best time",
      value: stats.bestTimeMs === null ? "—" : formatDuration(stats.bestTimeMs),
    },
    { label: "Hint-free", value: stats.hintFreeSolves },
  ],
  isDone: (day) => day.solved,
  rowStatus: (_dateKey, day) => {
    if (!day.solved) {
      // A stale unsolved save won't hydrate — opening the day starts
      // fresh, so don't advertise progress it can't keep.
      if (day.stale) return { text: "Not finished · older words", done: false };
      return { text: "In progress", done: false };
    }
    const words =
      day.cluedWord && day.hiddenWord
        ? ` · ${day.cluedWord.toUpperCase()} · ${day.hiddenWord.toUpperCase()}`
        : "";
    return {
      text: `Solved · ${formatDuration(day.elapsedMs)}${words}${day.stale ? " · older words" : ""}`,
      done: true,
    };
  },
};

/** Past daily puzzles: calendar mosaic + played days, newest first. */
export default function ArchivePage() {
  return <GameArchive config={config} />;
}
