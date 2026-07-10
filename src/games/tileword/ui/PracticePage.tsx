import { useState } from "react";
import { randomSeed } from "../../../lib/random";
import { practiceSeed } from "../engine/generator";
import type { Difficulty } from "../engine/types";
import { GameScreen } from "./GameScreen";

export default function PracticePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [seed, setSeed] = useState(() =>
    practiceSeed(randomSeed(), difficulty),
  );

  const changeDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    setSeed(practiceSeed(randomSeed(), d));
  };

  return (
    <GameScreen
      key={seed}
      mode={{ kind: "practice", seed, difficulty }}
      difficulty={difficulty}
      onDifficultyChange={changeDifficulty}
    />
  );
}
