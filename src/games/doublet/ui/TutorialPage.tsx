import { useEffect, useState } from "react";
import { markTutorialSeen } from "../state/persistence";
import { GameScreen } from "./GameScreen";

/**
 * The tutorial: the six-cell staircase board, with the step script running
 * above it. No difficulty pills — there is one fixed board — and nothing
 * here is persisted. Arriving is all it takes to mark the offer answered,
 * so a player who bails halfway is not asked again.
 */
export default function TutorialPage() {
  useEffect(() => {
    void markTutorialSeen();
  }, []);
  const [runId, setRunId] = useState(0);
  return (
    <GameScreen
      key={runId}
      mode={{ kind: "tutorial", difficulty: "easy" }}
      difficulty="easy"
      onRestartTutorial={() => setRunId((n) => n + 1)}
    />
  );
}
