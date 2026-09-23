import { GameTrends, solvedCounter, type GameTrendsConfig } from "../../../components/GameTrends";
import { formatDuration } from "../../../lib/date";
import { ARCHIVE_EPOCH, loadAllDailyProgress, type ArchivedDay } from "../state/persistence";

const config: GameTrendsConfig<ArchivedDay> = {
  gameId: "sixfold",
  accent: "sixfold",
  epoch: ARCHIVE_EPOCH,
  loadAllDays: loadAllDailyProgress,
  metrics: [
    {
      key: "time",
      label: "Solve time",
      value: (d) => (d.solved && !d.stale ? d.elapsedMs : null),
      format: formatDuration,
      lowerIsBetter: true,
    },
    solvedCounter<ArchivedDay>("hints", "Hints used", (d) => d.hints, {
      lowerIsBetter: true,
    }),
    solvedCounter<ArchivedDay>("conflicts", "Repeats made", (d) => d.conflicts, {
      lowerIsBetter: true,
    }),
    solvedCounter<ArchivedDay>("sessions", "Sessions to solve", (d) => d.sessions, {
      lowerIsBetter: true,
    }),
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
