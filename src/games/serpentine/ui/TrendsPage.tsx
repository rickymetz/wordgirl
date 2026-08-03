import {
  GameTrends,
  type GameTrendsConfig,
} from "../../../components/GameTrends";
import { formatDuration } from "../../../lib/date";
import {
  ARCHIVE_EPOCH,
  loadAllDailyProgress,
  type ArchivedDay,
} from "../state/persistence";

export const config: GameTrendsConfig<ArchivedDay> = {
  gameId: "serpentine",
  accent: "serpentine",
  epoch: ARCHIVE_EPOCH,
  loadAllDays: loadAllDailyProgress,
  metrics: [
    {
      // Per puzzle, not per day. A date holds a Haiku and a Poem, and the
      // roll-up sums the time across whichever were solved — so a day
      // where both fell charted as roughly double one where a single did,
      // on a line that reads lower as better. Dividing by the number
      // solved makes two days comparable however many boards each held.
      key: "time",
      label: "Time per puzzle",
      value: (d) =>
        d.solvedCount > 0 && !d.stale ? d.elapsedMs / d.solvedCount : null,
      format: formatDuration,
      lowerIsBetter: true,
    },
    {
      // The board you actually finished. This used to read `cellCount`,
      // which is the furthest traced on EITHER board — so abandoning a
      // long Poem after solving the Haiku reported the Poem's length as a
      // puzzle solved.
      key: "cells",
      label: "Puzzle length",
      value: (d) => d.solvedCellCount,
    },
    {
      key: "hints",
      label: "Hints used",
      value: (d) => (d.solved ? (d.hints ?? null) : null),
      lowerIsBetter: true,
    },
  ],
  hours: {
    label: "When you solve",
    value: (d) => (d.solved ? (d.solvedHour ?? null) : null),
  },
};

export default function TrendsPage() {
  return <GameTrends config={config} />;
}
