import { PracticeShell } from "../../../components/game/pageShells";
import { randomSeed } from "../../../lib/random";
import { practiceSeed } from "../engine/generator";
import { GameScreen } from "./GameScreen";

export default function PracticePage() {
  return (
    <PracticeShell
      gameId="sixfold"
      makeSeed={() => practiceSeed(randomSeed())}
      renderScreen={(seed, newPuzzle) => (
        <GameScreen key={seed} mode={{ kind: "practice", seed }} onNewPuzzle={newPuzzle} />
      )}
    />
  );
}
