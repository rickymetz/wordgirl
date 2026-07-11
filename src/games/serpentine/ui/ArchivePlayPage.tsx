import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { localDateKey } from "../../../lib/date";
import { ARCHIVE_EPOCH, resetDailyForReplay } from "../state/persistence";
import type { Difficulty } from "../engine/types";
import { GameScreen } from "./GameScreen";

export default function ArchivePlayPage() {
  const { dateKey } = useParams();
  const [runId, setRunId] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>("haiku");
  const valid =
    dateKey !== undefined &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateKey) &&
    dateKey >= ARCHIVE_EPOCH &&
    dateKey < localDateKey();

  if (!valid) return <Navigate to="/games/serpentine/archive" replace />;
  return (
    <GameScreen
      key={`${dateKey}:${difficulty}:${runId}`}
      mode={{ kind: "archive", dateKey, difficulty }}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      onReplay={async () => {
        await resetDailyForReplay(difficulty, dateKey);
        setRunId((n) => n + 1);
      }}
    />
  );
}
