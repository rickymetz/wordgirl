import { useState } from "react";
import { ArchivePlayShell } from "../../../components/game/pageShells";
import { ARCHIVE_EPOCH } from "../state/persistence";
import type { Difficulty } from "../engine/types";
import { GameScreen } from "./GameScreen";

/**
 * Plays a past daily: /games/doublet/archive/:dateKey.
 *
 * Three boards a day, so the difficulty pills stay — and there is no
 * replay here, which is why the shell is given no reset.
 */
export default function ArchivePlayPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  return (
    <ArchivePlayShell
      gameId="doublet"
      epoch={ARCHIVE_EPOCH}
      renderScreen={(dateKey) => (
        <GameScreen
          key={`${dateKey}:${difficulty}`}
          mode={{ kind: "archive", dateKey, difficulty }}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
        />
      )}
    />
  );
}
