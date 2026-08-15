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

/** The archive row's play-state line. Exported for its test. */
export function rowStatus(day: ArchivedDay): { text: string; done: boolean } {
  if (!day.solved) {
    // A two-board date says which half is standing; a one-board date
    // (anything before HARD_EPOCH) reads exactly as it always has.
    return {
      text:
        day.boards > 1
          ? `${day.solvedCount}/${day.boards} boards · ${day.foundWords.length} words`
          : `In progress · ${day.foundWords.length} words`,
      done: false,
    };
  }
  // A stale or retired save's result is real history but doesn't map
  // onto the current puzzle's combos. The save carries the day's word
  // total, so ranking needs no puzzle regeneration (old saves without
  // it just show the count).
  if (day.stale || day.retired || !day.totalWords) {
    return {
      text: `Solved · ${day.foundWords.length} words${
        day.stale || day.retired ? " · older words" : ""
      }`,
      done: true,
    };
  }
  return {
    text: `${day.foundWords.length}/${day.totalWords}${
      (day.hintLetters ?? 0) > 0 ? " · used hint" : ""
    }`,
    done: true,
  };
}

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
  rowStatus: (_dateKey, day) => rowStatus(day),
};

/** Past daily puzzles: calendar mosaic + played days, newest first. */
export default function ArchivePage() {
  return <GameArchive config={config} />;
}
