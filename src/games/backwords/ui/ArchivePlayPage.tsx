import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { trackArchivePlay, trackReplay } from "../../../lib/analytics";
import { localDateKey } from "../../../lib/date";
import { ARCHIVE_EPOCH, resetDailyForReplay } from "../state/persistence";
import { GameScreen } from "./GameScreen";

/** Plays a past daily puzzle: /games/backwords/archive/:dateKey */
export default function ArchivePlayPage() {
  useEffect(() => { trackArchivePlay("backwords"); }, []);
  const { dateKey } = useParams();
  const [runId, setRunId] = useState(0);
  const valid =
    dateKey !== undefined &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateKey) &&
    dateKey >= ARCHIVE_EPOCH &&
    dateKey < localDateKey();

  if (!valid) return <Navigate to="/games/backwords/archive" replace />;
  return (
    <GameScreen
      key={`${dateKey}:${runId}`}
      mode={{ kind: "archive", dateKey }}
      onReplay={async () => {
        trackReplay("backwords");
        // Wipe the day's progress (stats stay counted) and remount.
        await resetDailyForReplay(dateKey);
        setRunId((n) => n + 1);
      }}
    />
  );
}
