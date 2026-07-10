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
  type BackwordsStats,
} from "../state/persistence";

const config: GameArchiveConfig<ArchivedDay, BackwordsStats> = {
  gameId: "backwords",
  accent: "backwords",
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
    // "Mirror rows": the ✦ character stays in share strings only.
    { label: "Mirror rows", value: stats.glyphRows },
  ],
  isDone: (day) => day.solved,
  rowStatus: (_dateKey, day) => {
    if (!day.solved) {
      return {
        text: `In progress · ${day.rows.length} ${
          day.rows.length === 1 ? "word" : "words"
        }`,
        done: false,
      };
    }
    return {
      text: `Solved · ${day.rows.length} ${
        day.rows.length === 1 ? "word" : "words"
      }${day.stale ? " · older words" : ""}`,
      done: true,
    };
  },
};

/** Past daily puzzles: calendar mosaic + played days, newest first. */
export default function ArchivePage() {
  return <GameArchive config={config} />;
}
