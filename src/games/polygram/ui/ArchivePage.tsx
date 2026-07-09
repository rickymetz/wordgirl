import { use } from "react";
import {
  GameArchive,
  type GameArchiveConfig,
} from "../../../components/GameArchive";
import type { Dictionary } from "../../../lib/words/dictionary";
import { loadDictionary } from "../../../lib/words/loader";
import { rankFor } from "../engine/scoring";
import { generatePuzzle, dailySeed } from "../engine/generator";
import {
  ARCHIVE_EPOCH,
  displayStreak,
  loadAllDailyProgress,
  loadStats,
  type ArchivedDay,
  type PolygramStats,
} from "../state/persistence";

// score -> rank needs the day's puzzle; cache so each date generates
// at most once per session instead of on every list render.
const rankCache = new Map<string, string>();
function rankForDay(dict: Dictionary, dateKey: string, score: number): string {
  const key = `${dateKey}:${score}`;
  let rank = rankCache.get(key);
  if (!rank) {
    rank = rankFor(score, generatePuzzle(dict, dailySeed(dateKey)));
    rankCache.set(key, rank);
  }
  return rank;
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
    { label: "Best rank", value: stats.bestRank ?? "—" },
    { label: "Points", value: stats.totalScore },
  ],
  isDone: (day) => day.completed,
  rowStatus: (dateKey, day) => {
    if (!day.completed) {
      return { text: `In progress · ${day.score} pts`, done: false };
    }
    // A stale save was played against an older dictionary: its score is
    // real history but doesn't map onto the current puzzle's ranks.
    // `use` is conditional on purpose: the dictionary only loads (and
    // suspends) when a rank is actually displayed.
    const rank = day.stale
      ? "Completed"
      : rankForDay(use(loadDictionary()), dateKey, day.score);
    return {
      text: `${rank} · ${day.score} pts${
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
