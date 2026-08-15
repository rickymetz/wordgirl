import { useState } from "react";
import { ArchivePlayShell } from "../../../components/game/pageShells";
import type { Level } from "../engine/types";
import {
  ARCHIVE_EPOCH,
  hasHardBoard,
  resetDailyForReplay,
} from "../state/persistence";
import { GameScreen } from "./GameScreen";

/** Plays a past daily puzzle: /games/crosshatch/archive/:dateKey */
export default function ArchivePlayPage() {
  // Which board of that date is on screen. Held here rather than inside
  // renderScreen so the replay reset — which the shell owns — wipes the
  // board the player is actually looking at.
  const [level, setLevel] = useState<Level>("standard");
  return (
    <ArchivePlayShell
      gameId="crosshatch"
      epoch={ARCHIVE_EPOCH}
      resetForReplay={(dateKey) =>
        resetDailyForReplay(dateKey, hasHardBoard(dateKey) ? level : "standard")
      }
      renderScreen={(dateKey, runId, replay) => {
        const twoBoards = hasHardBoard(dateKey);
        return (
          <GameScreen
            key={`${dateKey}:${level}:${runId}`}
            mode={{
              kind: "archive",
              dateKey,
              level: twoBoards ? level : "standard",
            }}
            level={twoBoards ? level : undefined}
            onLevelChange={twoBoards ? setLevel : undefined}
            onReplay={replay}
          />
        );
      }}
    />
  );
}
