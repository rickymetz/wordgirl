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
  gameId: "doublet",
  accent: "doublet",
  epoch: ARCHIVE_EPOCH,
  loadAllDays: loadAllDailyProgress,
  metrics: [
    {
      key: "boards",
      label: "Boards solved",
      value: (d) => (d.startedCount > 0 ? d.solvedCount : null),
      format: (v) => `${Math.round(v * 10) / 10}/3`,
    },
    {
      key: "moves",
      label: "Moves placed",
      value: (d) => d.moves,
      format: (v) => `${Math.round(v * 10) / 10}`,
      lowerIsBetter: true,
    },
    {
      key: "rotations",
      label: "Rotations",
      value: (d) => d.rotations,
      format: (v) => `${Math.round(v * 10) / 10}`,
      lowerIsBetter: true,
    },
    {
      key: "time",
      label: "Play time",
      value: (d) => (d.startedCount > 0 ? d.elapsedMs / 1000 : null),
      format: fmtTime,
      lowerIsBetter: true,
    },
  ],
};

/** Play data over time — the archive's sibling page. */
export default function TrendsPage() {
  return <GameTrends config={config} />;
}
