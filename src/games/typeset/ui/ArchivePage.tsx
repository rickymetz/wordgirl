import { GameArchive, type GameArchiveConfig } from "../../../components/GameArchive";
import { ARCHIVE_EPOCH, displayStreak, loadAllDailyProgress, loadStats, type ArchivedDay, type TypesetStats } from "../state/persistence";

const sets = (n: number) => `${n} ${n === 1 ? "set" : "sets"}`;

/**
 * The archive row's play-state line, in the siblings' shape: "Solved · …" /
 * "In progress · …", and " · older boards" for a day saved against an
 * earlier deal. Exported for its test.
 */
export function rowStatus(day: ArchivedDay): { text: string; done: boolean } {
  const stale = day.stale ? " · older boards" : "";
  if (!day.solved) {
    return { text: `In progress · ${day.solvedCount}/2 boards · ${sets(day.setsFound)}${stale}`, done: false };
  }
  const extras = [
    day.misses ? `${day.misses} ${day.misses === 1 ? "miss" : "misses"}` : null,
    day.hints ? `${day.hints} ${day.hints === 1 ? "hint" : "hints"}` : null,
  ].filter(Boolean);
  return { text: [`Solved · ${sets(day.setsFound)}`, ...extras].join(" · ") + stale, done: true };
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
    { label: "Win %", value: stats.played > 0 ? `${Math.round((100 * stats.solved) / stats.played)}%` : "–" },
    { label: "Hint-free", value: stats.hintFreeDays },
  ],
  isDone: (day) => day.solved,
  rowStatus: (_dateKey, day) => rowStatus(day),
};

/** Past daily boards: calendar mosaic + played days, newest first. */
export default function ArchivePage() {
  return <GameArchive config={config} />;
}
