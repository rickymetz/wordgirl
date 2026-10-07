import { useState } from "react";
import { ArchivePlayShell } from "../../../components/game/pageShells";
import { dailyBoard, type BoardKind } from "../engine/schedule";
import { ARCHIVE_EPOCH, resetDailyForReplay, typesetPuzzleKey } from "../state/persistence";
import { GameScreen } from "./GameScreen";

/** Plays a past daily: /games/typeset/archive/:dateKey */
export default function ArchivePlayPage() {
  // Held outside renderScreen so the shell's replay reset wipes the board
  // the player is actually looking at.
  const [board, setBoard] = useState<BoardKind>("charset");
  return (
    <ArchivePlayShell
      gameId="typeset"
      epoch={ARCHIVE_EPOCH}
      resetForReplay={(dateKey) => {
        const b = dailyBoard(dateKey, board);
        return resetDailyForReplay(dateKey, board, b.sets.length, typesetPuzzleKey(b));
      }}
      renderScreen={(dateKey, runId, replay) => (
        <GameScreen key={`${dateKey}:${board}:${runId}`} mode={{ kind: "archive", dateKey, board }} onBoardChange={setBoard} onReplay={replay} />
      )}
    />
  );
}
