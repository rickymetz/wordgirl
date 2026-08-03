import { useState } from "react";
import { randomSeed } from "../../../lib/random";
import { practiceSeed } from "../engine/generator";
import { PracticeShell } from "../../../components/game/pageShells";
import type { Difficulty } from "../engine/types";
import { GameScreen } from "./GameScreen";

export default function PracticePage() {
  // Switching difficulty must hand over a board of the new size, which
  // is what `resetKey` buys: a fresh seed the moment it changes.
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  return (
    <PracticeShell
      gameId="doublet"
      makeSeed={() => practiceSeed(randomSeed(), difficulty)}
      resetKey={difficulty}
      renderScreen={(seed) => (
        <GameScreen
          key={seed}
          mode={{ kind: "practice", seed, difficulty }}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
        />
      )}
    />
  );
}
