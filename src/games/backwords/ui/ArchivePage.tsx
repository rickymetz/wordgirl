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
    // The tile a player can chase. Lifetime ✦ rows accrue whatever you
    // do, so they stayed a results badge and a trends line instead.
    { label: "Par solves", value: stats.parSolves },
  ],
  isDone: (day) => day.solved,
  rowStatus: (_dateKey, day) => {
    if (!day.solved) {
      // A stale (old-dictionary) unsolved save won't hydrate — opening
      // the day starts fresh, so don't advertise progress it can't keep.
      if (day.stale) {
        return { text: "Not finished · older words", done: false };
      }
      return {
        text: `In progress · ${day.rows.length} ${
          day.rows.length === 1 ? "row" : "rows"
        }`,
        done: false,
      };
    }
    // Days saved before par shipped have no par to compare against —
    // they read as a plain row count rather than claiming one.
    const par =
      day.parRows === undefined
        ? ""
        : day.rows.length <= day.parRows
          ? " · par"
          : ` · par ${day.parRows}`;
    return {
      text: `Solved · ${day.rows.length} ${
        day.rows.length === 1 ? "row" : "rows"
      }${par}${day.stale ? " · older words" : ""}`,
      done: true,
    };
  },
};

/** Past daily puzzles: calendar mosaic + played days, newest first. */
export default function ArchivePage() {
  return <GameArchive config={config} />;
}
