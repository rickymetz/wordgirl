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
  type CrosshatchStats,
} from "../state/persistence";

const config: GameArchiveConfig<ArchivedDay, CrosshatchStats> = {
  gameId: "crosshatch",
  accent: "crosshatch",
  epoch: ARCHIVE_EPOCH,
  loadAllDays: loadAllDailyProgress,
  loadStats,
  hasPlayed: (stats) => stats.played > 0,
  statTiles: (stats) => [
    { label: "Streak", value: displayStreak(stats) },
    { label: "Best streak", value: stats.bestStreak },
    { label: "Solved", value: stats.solved },
    { label: "Played", value: stats.played },
    { label: "Words", value: stats.totalWords },
  ],
  isDone: (day) => day.solved,
  rowStatus: (_dateKey, day) => {
    if (!day.solved) {
      return {
        text: `In progress · ${day.foundWords.length} words`,
        done: false,
      };
    }
    // A stale save was played against an older dictionary: its result
    // is real history but doesn't map onto the current puzzle's combos.
    // The save carries the day's word total, so ranking needs no
    // puzzle regeneration (old saves without it just show the count).
    if (day.stale || !day.totalWords) {
      return {
        text: `Solved · ${day.foundWords.length} words${
          day.stale ? " · older words" : ""
        }`,
        done: true,
      };
    }
    return {
      text: `${day.foundWords.length}/${day.totalWords}${
        Object.keys(day.revealed ?? {}).length > 0 ? " · used hint" : ""
      }`,
      done: true,
    };
  },
};

/** Past daily puzzles: calendar mosaic + played days, newest first. */
export default function ArchivePage() {
  return <GameArchive config={config} />;
}
