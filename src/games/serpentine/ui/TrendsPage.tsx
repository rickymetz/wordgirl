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

const config: GameTrendsConfig<ArchivedDay> = {
  gameId: "serpentine",
  accent: "serpentine",
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
      key: "cells",
      label: "Grid size",
      value: (d) => (d.solved ? d.cells.length : null),
    },
  ],
};

export default function TrendsPage() {
  return <GameTrends config={config} />;
}
