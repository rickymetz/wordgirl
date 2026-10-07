import { GameArchive, type GameArchiveConfig } from "../../../components/GameArchive";
import { ARCHIVE_EPOCH, displayStreak, loadAllDailyProgress, loadStats, type ArchivedDay, type TypesetStats } from "../state/persistence";

/** The archive row's play-state line. Exported for its test. */
export function rowStatus(day: ArchivedDay): { text: string; done: boolean } {
  if (!day.solved) {
    return { text: `${day.solvedCount}/2 boards · ${day.setsFound} sets`, done: false };
  }
  const extras = [
    day.misses ? `${day.misses} ${day.misses === 1 ? "miss" : "misses"}` : null,
    day.hints ? "used hint" : null,
  ].filter(Boolean);
  return { text: [`${day.setsFound} sets`, ...extras].join(" · "), done: true };
}

const config: GameArchiveConfig<ArchivedDay, TypesetStats> = {
  gameId: "typeset",
  accent: "typeset",
  epoch: ARCHIVE_EPOCH,
  loadAllDays: loadAllDailyProgress,
  loadStats,
  hasPlayed: (stats) => stats.played > 0,
  statTiles: (stats) => [
    { label: "Streak", value: displayStreak(stats) },
    { label: "Best streak", value: stats.bestStreak },
    { label: "Solved", value: stats.solved },
    { label: "Played", value: stats.played },
    { label: "Solve rate", value: stats.played > 0 ? `${Math.round((100 * stats.solved) / stats.played)}%` : "–" },
  ],
  isDone: (day) => day.solved,
  rowStatus: (_dateKey, day) => rowStatus(day),
};

/** Past daily boards: calendar mosaic + played days, newest first. */
export default function ArchivePage() {
  return <GameArchive config={config} />;
}
