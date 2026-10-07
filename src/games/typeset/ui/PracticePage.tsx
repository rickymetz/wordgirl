import { useState } from "react";
import { PracticeShell } from "../../../components/game/pageShells";
import { randomSeed } from "../../../lib/random";
import type { BoardKind } from "../engine/schedule";
import { GameScreen } from "./GameScreen";

export default function PracticePage() {
  // Practice offers both kinds of board; switching draws a fresh one of
  // the new kind (PracticeShell's resetKey).
  const [board, setBoard] = useState<BoardKind>("charset");
  return (
    <PracticeShell
      gameId="typeset"
      makeSeed={randomSeed}
      resetKey={board}
      renderScreen={(seed, newPuzzle) => (
        <GameScreen key={seed} mode={{ kind: "practice", seed, board }} onBoardChange={setBoard} onNewPuzzle={newPuzzle} />
      )}
    />
  );
}
