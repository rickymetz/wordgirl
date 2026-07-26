import { useEffect, useState } from "react";
import { markTutorialSeen } from "../state/persistence";
import { GameScreen } from "./GameScreen";

/**
 * The tutorial: the fixed 3×4 grid whose phrase describes the game, with
 * the step script running above it. No difficulty pills — the tutorial has
 * one board — and nothing here is persisted. Arriving is all it takes to
 * mark the offer answered, so a player who bails halfway is not asked
 * again.
 */
export default function TutorialPage() {
  useEffect(() => {
    void markTutorialSeen();
  }, []);
  const [runId, setRunId] = useState(0);
  return (
    <GameScreen
      key={runId}
      mode={{ kind: "tutorial", difficulty: "haiku" }}
      onRestartTutorial={() => setRunId((n) => n + 1)}
    />
  );
}
