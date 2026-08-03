import { TutorialShell } from "../../../components/game/pageShells";
import { markTutorialSeen } from "../state/persistence";
import { GameScreen } from "./GameScreen";

/**
 * The six-cell staircase board, with the step script above it. No
 * difficulty pills — the tutorial has one board.
 */
export default function TutorialPage() {
  return (
    <TutorialShell
      gameId="doublet"
      markSeen={markTutorialSeen}
      renderScreen={(runId, restart) => (
        <GameScreen
          key={runId}
          mode={{ kind: "tutorial", difficulty: "easy" }}
          difficulty="easy"
          onRestartTutorial={restart}
        />
      )}
    />
  );
}
