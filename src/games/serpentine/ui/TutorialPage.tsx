import { TutorialShell } from "../../../components/game/pageShells";
import { markTutorialSeen } from "../state/persistence";
import { GameScreen } from "./GameScreen";

/**
 * The fixed 3×4 grid whose phrase describes the game, with the step
 * script above it. No difficulty pills — the tutorial has one board.
 */
export default function TutorialPage() {
  return (
    <TutorialShell
      gameId="serpentine"
      markSeen={markTutorialSeen}
      renderScreen={(runId, restart) => (
        <GameScreen
          key={runId}
          mode={{ kind: "tutorial", difficulty: "haiku" }}
          onRestartTutorial={restart}
        />
      )}
    />
  );
}
