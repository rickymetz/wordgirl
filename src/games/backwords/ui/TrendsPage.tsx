import { GameTrends, type GameTrendsConfig } from "../../../components/GameTrends";
import {
  ARCHIVE_EPOCH,
  loadAllDailyProgress,
  type ArchivedDay,
} from "../state/persistence";

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const config: GameTrendsConfig<ArchivedDay> = {
  gameId: "backwords",
  accent: "backwords",
  epoch: ARCHIVE_EPOCH,
  loadAllDays: loadAllDailyProgress,
  metrics: [
    {
      key: "time",
      label: "Solve time",
      value: (d) => (d.solved && !d.stale ? d.elapsedMs / 1000 : null),
      format: fmtTime,
      lowerIsBetter: true,
    },
    {
      key: "words",
      label: "Words placed",
      value: (d) => (d.solved ? d.rows.length : null),
      format: (v) => `${Math.round(v * 10) / 10}`,
    },
    {
      key: "glyphRows",
      label: "Mirror rows",
      value: (d) =>
        d.solved && d.glyphRows !== undefined ? d.glyphRows : null,
      format: (v) => `${Math.round(v * 10) / 10}`,
    },
    {
      key: "takeBacks",
      label: "Take-backs",
      value: (d) =>
        d.solved && d.takeBacks !== undefined ? d.takeBacks : null,
      format: (v) => `${Math.round(v * 10) / 10}`,
      lowerIsBetter: true,
    },
    {
      key: "invalids",
      label: "Rejected words",
      value: (d) =>
        d.solved && d.invalids !== undefined ? d.invalids : null,
      format: (v) => `${Math.round(v * 10) / 10}`,
      lowerIsBetter: true,
    },
    {
      key: "sessions",
      label: "Sessions to solve",
      value: (d) =>
        d.solved && d.sessions !== undefined ? d.sessions : null,
      format: (v) => `${Math.round(v * 10) / 10}`,
      lowerIsBetter: true,
    },
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
