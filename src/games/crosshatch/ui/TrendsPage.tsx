import {
  GameTrends,
  solvedCounter,
  type GameTrendsConfig,
} from "../../../components/GameTrends";
import { formatDuration } from "../../../lib/date";
import { solveTarget } from "../engine/scoring";
import {
  ARCHIVE_EPOCH,
  loadAllDailyProgress,
  type ArchivedDay,
} from "../state/persistence";

const hintLetters = (d: ArchivedDay) =>
  Object.values(d.revealed ?? {}).reduce((a, p) => a + p.length, 0);

const config: GameTrendsConfig<ArchivedDay> = {
  gameId: "crosshatch",
  accent: "crosshatch",
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
      key: "words",
      label: "Words found",
      value: (d) => (d.foundWords.length > 0 ? d.foundWords.length : null),
    },
    {
      key: "hints",
      label: "Hint letters",
      value: (d) => (d.solved ? hintLetters(d) : null),
      lowerIsBetter: true,
    },
    {
      key: "extra",
      label: "Words past the solve",
      value: (d) =>
        d.solved && d.totalWords
          ? Math.max(0, d.foundWords.length - solveTarget(d.totalWords))
          : null,
    },
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
