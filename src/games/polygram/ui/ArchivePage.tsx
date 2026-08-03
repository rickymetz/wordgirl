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

/** The archive row's play-state line. Exported for its test. */
export function rowStatus(day: ArchivedDay): { text: string; done: boolean } {
  const found = day.foundWords.length;
  if (!day.completed) {
    return { text: `In progress · ${found} words`, done: false };
  }
  // A stale save's words are real history from a puzzle that no longer
  // exists, and `totalWords` accrues only from the day it shipped —
  // either way the row reports the count alone rather than a ratio
  // against a total the player can't reproduce.
  if (day.stale || !day.totalWords) {
    return {
      text: `Solved · ${found} words${day.stale ? " · older words" : ""}`,
      done: true,
    };
  }
  return {
    text: `${found}/${day.totalWords}${
      Object.keys(day.revealed ?? {}).length > 0 ? " · used hint" : ""
    }`,
    done: true,
  };
}

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
    { label: "Words", value: stats.totalWords },
  ],
  isDone: (day) => day.completed,
  rowStatus: (_dateKey, day) => rowStatus(day),
};

/** Past daily puzzles: calendar mosaic + played days, newest first. */
export default function ArchivePage() {
  return <GameArchive config={config} />;
}
