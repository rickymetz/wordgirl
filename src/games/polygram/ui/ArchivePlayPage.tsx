import { ArchivePlayShell } from "../../../components/game/pageShells";
import { ARCHIVE_EPOCH, resetDailyForReplay } from "../state/persistence";
import { GameScreen } from "./GameScreen";

/** Plays a past daily puzzle: /games/polygram/archive/:dateKey */
export default function ArchivePlayPage() {
  return (
    <ArchivePlayShell
      gameId="polygram"
      epoch={ARCHIVE_EPOCH}
      resetForReplay={(dateKey) => resetDailyForReplay(dateKey)}
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
