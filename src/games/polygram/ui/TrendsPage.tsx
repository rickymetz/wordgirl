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

// Older saves stored per-word COUNTS; newer store position arrays.
const hintLetters = (d: ArchivedDay) =>
  Object.values(d.revealed ?? {}).reduce<number>(
    (a, p) => a + (typeof p === "number" ? p : p.length),
    0,
  );

const config: GameTrendsConfig<ArchivedDay> = {
  gameId: "polygram",
  accent: 3,
  epoch: ARCHIVE_EPOCH,
  loadAllDays: loadAllDailyProgress,
  metrics: [
    {
      key: "score",
      label: "Score",
      value: (d) => (d.score > 0 ? d.score : null),
      format: (v) => `${Math.round(v)}`,
    },
    {
      key: "time",
      label: "Completion time",
      value: (d) => (d.completed && !d.stale ? d.elapsedMs / 1000 : null),
      format: fmtTime,
      lowerIsBetter: true,
    },
    {
      key: "hints",
      label: "Hint letters",
      value: (d) => (d.completed ? hintLetters(d) : null),
      format: (v) => `${Math.round(v * 10) / 10}`,
      lowerIsBetter: true,
    },
  ],
};

/** Play data over time — the archive's sibling page. */
export default function TrendsPage() {
  return <GameTrends config={config} />;
}
