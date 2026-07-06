import { useState } from "react";
import { randomSeed } from "../../../lib/random";
import { practiceSeed } from "../engine/generator";
import { GameScreen } from "./GameScreen";

export default function PracticePage() {
  const [seed, setSeed] = useState(() => practiceSeed(randomSeed()));
  return (
    // key remounts the whole screen for a fresh puzzle
    <GameScreen
      key={seed}
      mode={{ kind: "practice", seed }}
      onNewPuzzle={() => setSeed(practiceSeed(randomSeed()))}
    />
  );
}
