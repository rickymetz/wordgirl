import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { trackArchivePlay } from "../../../lib/analytics";
import { localDateKey } from "../../../lib/date";
import type { Difficulty } from "../engine/types";
import { ARCHIVE_EPOCH } from "../state/persistence";
import { GameScreen } from "./GameScreen";

export default function ArchivePlayPage() {
  useEffect(() => { trackArchivePlay("doublet"); }, []);
  const { dateKey } = useParams();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const valid =
    dateKey !== undefined &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateKey) &&
    dateKey >= ARCHIVE_EPOCH &&
    dateKey < localDateKey();

  if (!valid) return <Navigate to="/games/doublet/archive" replace />;
  return (
    <GameScreen
      key={`${dateKey}:${difficulty}`}
      mode={{ kind: "archive", dateKey, difficulty }}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
    />
  );
}
