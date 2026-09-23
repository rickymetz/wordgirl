import { use } from "react";
import { ArchivePlayShell } from "../../../components/game/pageShells";
import { loadDictionary } from "../../../lib/words/loader";
import { dailyPuzzle } from "../engine/generator";
import { initialEntries } from "../state/reducer";
import {
  ARCHIVE_EPOCH,
  anagridPuzzleKey,
  resetDailyForReplay,
} from "../state/persistence";
import { GameScreen } from "./GameScreen";

/** Plays a past daily puzzle: /games/anagrid/archive/:dateKey */
export default function ArchivePlayPage() {
  const dict = use(loadDictionary());
  return (
    <ArchivePlayShell
      gameId="anagrid"
      epoch={ARCHIVE_EPOCH}
      resetForReplay={(dateKey) => {
        const puzzle = dailyPuzzle(dict, dateKey).puzzle;
        return resetDailyForReplay(dateKey, initialEntries(puzzle), anagridPuzzleKey(puzzle));
      }}
      renderScreen={(dateKey, runId, replay) => (
        <GameScreen
          key={`${dateKey}:${runId}`}
          mode={{ kind: "archive", dateKey }}
          onReplay={replay}
        />
      )}
    />
  );
}
