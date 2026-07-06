import { Navigate, useParams } from "react-router-dom";
import { localDateKey } from "../../../lib/date";
import { ARCHIVE_EPOCH } from "../state/persistence";
import { GameScreen } from "./GameScreen";

/** Plays a past daily puzzle: /games/polygram/archive/:dateKey */
export default function ArchivePlayPage() {
  const { dateKey } = useParams();
  const valid =
    dateKey !== undefined &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateKey) &&
    dateKey >= ARCHIVE_EPOCH &&
    dateKey < localDateKey();

  if (!valid) return <Navigate to="/games/polygram/archive" replace />;
  return <GameScreen key={dateKey} mode={{ kind: "archive", dateKey }} />;
}
