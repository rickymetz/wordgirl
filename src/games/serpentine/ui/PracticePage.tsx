import { useState } from "react";
import { randomSeed } from "../../../lib/random";
import { practiceSeed } from "../engine/practice";
import type { Difficulty } from "../engine/types";
import { GameScreen } from "./GameScreen";

export default function PracticePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("haiku");
  const [seed, setSeed] = useState(() => practiceSeed(randomSeed(), difficulty));
  return (
    <GameScreen
      key={seed}
      mode={{ kind: "practice", seed, difficulty }}
      difficulty={difficulty}
      onDifficultyChange={(d) => {
        setDifficulty(d);
        setSeed(practiceSeed(randomSeed(), d));
      }}
      onNewPuzzle={() => setSeed(practiceSeed(randomSeed(), difficulty))}
    />
  );
}
