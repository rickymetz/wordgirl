import { randomSeed } from "../../../lib/random";
import { practiceSeed } from "../engine/generator";
import { PracticeShell } from "../../../components/game/pageShells";
import { GameScreen } from "./GameScreen";

export default function PracticePage() {
  return (
    <PracticeShell
      gameId="pierglass"
      makeSeed={() => practiceSeed(randomSeed())}
      renderScreen={(seed, newPuzzle) => (
        <GameScreen
          key={seed}
          mode={{ kind: "practice", seed }}
          onNewPuzzle={newPuzzle}
        />
      )}
    />
  );
}
