import { useState } from "react";
import { PracticeShell } from "../../../components/game/pageShells";
import { randomSeed } from "../../../lib/random";
import { DAILY_DIFFICULTY, practiceSeed } from "../engine/generator";
import { GameScreen, type PracticeBoard } from "./GameScreen";

/** Prototype: the sparse board is the generator's "hard" setting. */
const DIFFICULTY = { standard: DAILY_DIFFICULTY, sparse: "hard" } as const;

export default function PracticePage() {
  // Switching boards deals a fresh puzzle of the new kind (resetKey).
  const [board, setBoard] = useState<PracticeBoard>("standard");
  return (
    <PracticeShell
      gameId="sixfold"
      makeSeed={() => practiceSeed(randomSeed(), DIFFICULTY[board])}
      resetKey={board}
      renderScreen={(seed, newPuzzle) => (
        <GameScreen
          key={seed}
          mode={{ kind: "practice", seed, difficulty: DIFFICULTY[board] }}
          board={board}
          onBoardChange={setBoard}
          onNewPuzzle={newPuzzle}
        />
      )}
    />
  );
}
