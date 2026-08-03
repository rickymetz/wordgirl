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

/**
 * Hint letters, or undefined for a save that predates the field.
 *
 * `validDay` admits a save with no `revealed` at all, and folding that to
 * 0 charted a hint-free day the player never had — a best-ever mark on a
 * lower-is-better line, and an average dragged toward zero by days that
 * hold no hint data whatsoever. `solvedCounter` turns undefined into the
 * gap it should always have been.
 */
const hintLetters = (d: ArchivedDay) =>
  d.revealed === undefined
    ? undefined
    : Object.values(d.revealed).reduce((a, p) => a + p.length, 0);

export const config: GameTrendsConfig<ArchivedDay> = {
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
    solvedCounter<ArchivedDay>("hints", "Hint letters", hintLetters, {
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
