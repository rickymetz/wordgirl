import { TutorialShell } from "../../../components/game/pageShells";
import { markTutorialSeen } from "../state/persistence";
import { GameScreen } from "./GameScreen";

/** The hand-picked nine-card board, with the step script above it. */
export default function TutorialPage() {
  return (
    <TutorialShell
      gameId="typeset"
      markSeen={markTutorialSeen}
      renderScreen={(runId, restart) => <GameScreen key={runId} mode={{ kind: "tutorial" }} onRestartTutorial={restart} />}
    />
  );
}
