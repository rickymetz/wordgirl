import { GameTrends, type GameTrendsConfig } from "../../../components/GameTrends";
import { formatDuration } from "../../../lib/date";
import {
  ARCHIVE_EPOCH,
  loadAllDailyProgress,
  type ArchivedDay,
} from "../state/persistence";

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
    // Counters gate on startedCount like boards/time: a day merely
    // OPENED (initial save, nothing placed) must not chart its zeros
    // as best-ever values. The roll-up already yields null for days
    // whose saves predate tracking.
    {
      key: "moves",
      label: "Moves placed",
      value: (d) => (d.startedCount > 0 ? d.moves : null),
      lowerIsBetter: true,
    },
    {
      key: "rotations",
      label: "Rotations",
      value: (d) => (d.startedCount > 0 ? d.rotations : null),
      lowerIsBetter: true,
    },
    {
      key: "removals",
      label: "Take-backs",
      value: (d) => (d.startedCount > 0 ? d.removals : null),
      lowerIsBetter: true,
    },
    {
      key: "invalidBoards",
      label: "Invalid boards",
      value: (d) => (d.startedCount > 0 ? d.invalidBoards : null),
      lowerIsBetter: true,
    },
    {
      key: "hints",
      label: "Hints used",
      value: (d) => (d.startedCount > 0 ? d.hints : null),
      lowerIsBetter: true,
    },
    {
      key: "sessions",
      label: "Board opens",
      value: (d) => (d.startedCount > 0 ? d.sessions : null),
      lowerIsBetter: true,
    },
    {
      key: "time",
      label: "Play time",
      value: (d) => (d.startedCount > 0 ? d.elapsedMs : null),
      format: formatDuration,
      lowerIsBetter: true,
    },
  ],
  hours: {
    label: "When you solve",
    value: (d) => d.solvedHour,
  },
};

/** Play data over time — the archive's sibling page. */
export default function TrendsPage() {
  return <GameTrends config={config} />;
}
