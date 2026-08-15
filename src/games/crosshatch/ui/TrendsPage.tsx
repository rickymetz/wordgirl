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
 * The day's counters come pre-summed across its boards, as `null` when
 * any board's save predates the counter — a partial sum presented as a
 * day's total is as fake as a zero. `solvedCounter` speaks `undefined`
 * for that gap, so this is the one translation between them.
 *
 * The distinction that has to survive: a save with NO `revealed` field
 * is unknown (a gap), while an empty one is a day that recorded hints
 * and used none (a real 0). The roll-up keeps them apart; folding them
 * together would draw a hint-free day the player never had — best-ever
 * on a lower-is-better line, and an average dragged toward zero.
 */
const gap = (n: number | null) => n ?? undefined;

export const config: GameTrendsConfig<ArchivedDay> = {
  gameId: "crosshatch",
  accent: "crosshatch",
  epoch: ARCHIVE_EPOCH,
  loadAllDays: loadAllDailyProgress,
  metrics: [
    {
      key: "time",
      // Both boards' time, and only for a day where both were solved —
      // half a day's play charted against whole ones would read as a
      // personal best that never happened.
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
    solvedCounter<ArchivedDay>(
      "hints",
      "Hint letters",
      (d) => gap(d.hintLetters),
      { lowerIsBetter: true },
    ),
    solvedCounter<ArchivedDay>(
      "invalids",
      "Rejected words",
      (d) => gap(d.invalids),
      { lowerIsBetter: true },
    ),
    solvedCounter<ArchivedDay>(
      "sessions",
      "Sessions to solve",
      (d) => gap(d.sessions),
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
