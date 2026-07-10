import { GameTrends, type GameTrendsConfig } from "../../../components/GameTrends";
import { formatDuration } from "../../../lib/date";
import {
  ARCHIVE_EPOCH,
  loadAllDailyProgress,
  type ArchivedDay,
} from "../state/persistence";

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
      // Level N's words are exactly N letters, so the deepest level
      // reached is the longest word found — derivable from any save.
      key: "level",
      label: "Level reached",
      value: (d) =>
        d.foundWords.length > 0
          ? Math.max(...d.foundWords.map((w) => w.length))
          : null,
      format: (v) => `${Math.round(v)}`,
    },
    {
      key: "time",
      label: "Completion time",
      value: (d) => (d.completed && !d.stale ? d.elapsedMs : null),
      format: formatDuration,
      lowerIsBetter: true,
    },
    {
      key: "hints",
      label: "Hint letters",
      value: (d) => (d.completed ? hintLetters(d) : null),
      lowerIsBetter: true,
    },
  ],
};

/** Play data over time — the archive's sibling page. */
export default function TrendsPage() {
  return <GameTrends config={config} />;
}
