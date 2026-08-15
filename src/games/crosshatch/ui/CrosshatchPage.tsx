import { useEffect, useState } from "react";
import { localDateKey } from "../../../lib/date";
import type { Level } from "../engine/types";
import { hasHardBoard } from "../state/persistence";
import { GameScreen } from "./GameScreen";

export default function CrosshatchPage() {
  // The mounted date. Crossing midnight with the app open (or resuming
  // an iOS PWA on a new day) must remount onto the new puzzle.
  const [dateKey, setDateKey] = useState(() => localDateKey());
  // The day opens on the normal board — the one every day has had.
  const [level, setLevel] = useState<Level>("normal");

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

  // Remount per board: every hook in the screen freezes its date and
  // puzzle at mount, and the clock resets with them.
  const twoBoards = hasHardBoard(dateKey);
  return (
    <GameScreen
      key={`${dateKey}:${level}`}
      mode={{ kind: "daily", dateKey, level: twoBoards ? level : "normal" }}
      level={twoBoards ? level : undefined}
      onLevelChange={twoBoards ? setLevel : undefined}
    />
  );
}
