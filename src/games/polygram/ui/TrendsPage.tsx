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
 * Older saves stored per-word COUNTS; newer store position arrays.
 *
 * Undefined rather than 0 when the field is missing, so such a day charts
 * as a gap. `validDay` rejects those saves today, which makes this arm
 * unreachable — it is here so that relaxing the guard (crosshatch's admits
 * them) cannot quietly start charting hint-free days nobody played.
 */
const hintLetters = (d: ArchivedDay) =>
  d.revealed === undefined
    ? undefined
    : Object.values(d.revealed).reduce<number>(
        (a, p) => a + (typeof p === "number" ? p : p.length),
        0,
      );

export const config: GameTrendsConfig<ArchivedDay> = {
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
      // Score alone is not comparable across days: the ceiling moves with
      // the letter set, so 300 on a 340-point board is a near sweep and on
      // a 610-point one is half a game. Days banked before `maxScore` was
      // stored have no denominator and chart as gaps.
      key: "share",
      label: "Share of possible",
      value: (d) =>
        d.maxScore && d.maxScore > 0 && d.score > 0
          ? (d.score / d.maxScore) * 100
          : null,
      format: (v) => `${Math.round(v)}%`,
    },
    {
      key: "words",
      label: "Words found",
      value: (d) => (d.foundWords.length > 0 ? d.foundWords.length : null),
      format: (v) => `${Math.round(v)}`,
    },
    solvedCounter<ArchivedDay>("hints", "Hint letters", hintLetters, {
      lowerIsBetter: true,
    }),
    // Already in every save and never charted until now: the levels a
    // player gave up on is the plainest read there is on which days won.
    // `?.length` rather than `?? 0` — a save from before skipping existed
    // knows of no levels skipped, which is not the same as none.
    solvedCounter<ArchivedDay>(
      "skipped",
      "Levels skipped",
      (d) => d.skippedLevels?.length,
      { lowerIsBetter: true },
    ),
    solvedCounter<ArchivedDay>(
      "sessions",
      "Sessions to finish",
      (d) => d.sessions,
      { lowerIsBetter: true },
    ),
  ],
  // Accrues from the day this shipped: days banked before then carry no
  // hour and are simply absent from the histogram.
  hours: {
    label: "When you solve",
    value: (d) => (d.completed ? (d.solvedHour ?? null) : null),
  },
};

/** Play data over time — the archive's sibling page. */
export default function TrendsPage() {
  return <GameTrends config={config} />;
}
