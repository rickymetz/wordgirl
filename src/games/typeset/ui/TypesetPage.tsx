import { useEffect, useState } from "react";
import { localDateKey } from "../../../lib/date";
import type { BoardKind } from "../engine/schedule";
import { GameScreen } from "./GameScreen";

export default function TypesetPage() {
  // The mounted date. Crossing midnight with the app open (or resuming a
  // PWA on a new day) must remount onto the new boards.
  const [dateKey, setDateKey] = useState(() => localDateKey());
  // The day opens on the character-set board; either order counts.
  const [board, setBoard] = useState<BoardKind>("charset");

  useEffect(() => {
    const check = () => {
      const now = localDateKey();
      if (now !== dateKey) setDateKey(now);
    };
    document.addEventListener("visibilitychange", check);
    const timer = setInterval(check, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", check);
      clearInterval(timer);
    };
  }, [dateKey]);

  // Remount per board: each board has its own clock and its own save.
  return <GameScreen key={`${dateKey}:${board}`} mode={{ kind: "daily", dateKey, board }} onBoardChange={setBoard} />;
}
