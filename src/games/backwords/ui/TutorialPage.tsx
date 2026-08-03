import { useEffect, useState } from "react";
import { markTutorialSeen } from "../state/persistence";
import { trackTutorialStarted } from "../../../lib/analytics";
import { GameScreen } from "./GameScreen";

/**
 * The tutorial: the five-letter ADOPT bank, with the step script running
 * above the board. Nothing here is persisted — arriving is all it takes to
 * mark the offer answered, so a player who bails halfway is not asked
 * again.
 */
export default function TutorialPage() {
  useEffect(() => {
    void markTutorialSeen();
    // Every route in lands here — the first-visit prompt, the hub bento
    // tile, and the coach sheet's link — so this counts them all.
    trackTutorialStarted("backwords");
  }, []);
  const [runId, setRunId] = useState(0);
  return (
    <GameScreen
      key={runId}
      mode={{ kind: "tutorial" }}
      onRestartTutorial={() => setRunId((n) => n + 1)}
    />
  );
}
