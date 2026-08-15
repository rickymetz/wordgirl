import { useState } from "react";
import { randomSeed } from "../../../lib/random";
import { practiceSeed } from "../engine/generator";
import { PracticeShell } from "../../../components/game/pageShells";
import type { Level } from "../engine/types";
import { GameScreen } from "./GameScreen";

export default function PracticePage() {
  // Practice offers both boards too — switching draws a fresh puzzle of
  // the new kind (PracticeShell's resetKey does that).
  const [level, setLevel] = useState<Level>("normal");
  return (
    <PracticeShell
      gameId="crosshatch"
      makeSeed={() => practiceSeed(randomSeed(), level)}
      resetKey={level}
      renderScreen={(seed, newPuzzle) => (
        <GameScreen
          key={seed}
          mode={{ kind: "practice", seed }}
          level={level}
          onLevelChange={setLevel}
          onNewPuzzle={newPuzzle}
        />
      )}
    />
  );
}
