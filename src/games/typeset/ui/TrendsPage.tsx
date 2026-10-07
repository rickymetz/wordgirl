import { GameTrends, solvedCounter, type GameTrendsConfig } from "../../../components/GameTrends";
import { formatDuration } from "../../../lib/date";
import { ARCHIVE_EPOCH, loadAllDailyProgress, type ArchivedDay } from "../state/persistence";

/** null = a board's save predates the counter: a gap, never a fake zero. */
const gap = (n: number | null) => n ?? undefined;

export const config: GameTrendsConfig<ArchivedDay> = {
  gameId: "typeset",
  accent: "typeset",
  epoch: ARCHIVE_EPOCH,
  loadAllDays: loadAllDailyProgress,
  metrics: [
    {
      key: "time",
      // Both boards' time, only for a day where both were solved — half a
      // day charted against whole ones would read as a false best.
      label: "Solve time",
      value: (d) => (d.solved && !d.stale ? d.elapsedMs : null),
      format: formatDuration,
      lowerIsBetter: true,
    },
    solvedCounter<ArchivedDay>("misses", "Misses", (d) => gap(d.misses), { lowerIsBetter: true }),
    solvedCounter<ArchivedDay>("hints", "Hints used", (d) => gap(d.hints), { lowerIsBetter: true }),
    solvedCounter<ArchivedDay>("sessions", "Sessions to solve", (d) => gap(d.sessions), { lowerIsBetter: true }),
  ],
  hours: {
    label: "When you solve",
    value: (d) => (d.solved ? (d.solvedHour ?? null) : null),
  },
};

/** Play data over time — the archive's sibling page. */
export default function TrendsPage() {
  return <GameTrends config={config} />;
}
