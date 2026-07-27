import {
  GameTrends,
  solvedCounter,
  type GameTrendsConfig,
} from "../../../components/GameTrends";
import { formatDuration } from "../../../lib/date";
import {
  ARCHIVE_EPOCH,
  loadAllDailyProgress,
  type ArchivedDay,
} from "../state/persistence";

const config: GameTrendsConfig<ArchivedDay> = {
  gameId: "backwords",
  accent: "backwords",
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
    {
      key: "rows",
      label: "Rows placed",
      value: (d) => (d.solved ? d.rows.length : null),
      lowerIsBetter: true,
    },
    {
      // 0 is par. Days saved before par shipped chart as a GAP, never a
      // fake 0 — which on a lower-is-better line would read as a par run
      // that never happened.
      key: "overPar",
      label: "Rows over par",
      value: (d) =>
        d.solved && d.parRows !== undefined
          ? Math.max(0, d.rows.length - d.parRows)
          : null,
      lowerIsBetter: true,
    },
    solvedCounter<ArchivedDay>("glyphRows", "Mirror rows", (d) => d.glyphRows),
    solvedCounter<ArchivedDay>("takeBacks", "Take-backs", (d) => d.takeBacks, {
      lowerIsBetter: true,
    }),
    solvedCounter<ArchivedDay>("hints", "Hints used", (d) => d.hints, {
      lowerIsBetter: true,
    }),
    solvedCounter<ArchivedDay>(
      "invalids",
      "Rejected words",
      (d) => d.invalids,
      { lowerIsBetter: true },
    ),
    solvedCounter<ArchivedDay>(
      "sessions",
      "Sessions to solve",
      (d) => d.sessions,
      { lowerIsBetter: true },
    ),
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
