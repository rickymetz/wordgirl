import { useState } from "react";
import { ArchivePlayShell } from "../../../components/game/pageShells";
import { ARCHIVE_EPOCH, resetDailyForReplay } from "../state/persistence";
import { getDailyPuzzle } from "../engine/dailySeed";
import type { Difficulty } from "../engine/types";
import { GameScreen } from "./GameScreen";

/**
 * Plays a past daily: /games/serpentine/archive/:dateKey.
 *
 * Two boards a day, so the difficulty pills stay, and a replay has to
 * name which board it is wiping.
 */
export default function ArchivePlayPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("haiku");
  return (
    <ArchivePlayShell
      gameId="serpentine"
      epoch={ARCHIVE_EPOCH}
      resetForReplay={async (dateKey) => {
        const puzzle = getDailyPuzzle(difficulty, dateKey);
        await resetDailyForReplay(difficulty, dateKey, puzzle.id);
      }}
      renderScreen={(dateKey, runId, replay) => (
        <GameScreen
          key={`${dateKey}:${difficulty}:${runId}`}
          mode={{ kind: "archive", dateKey, difficulty }}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          onReplay={replay}
        />
      )}
    />
  );
}
