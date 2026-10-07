import { useState } from "react";
import { useToday } from "../../../lib/useToday";
import type { Level } from "../engine/types";
import { hasHardBoard } from "../state/persistence";
import { GameScreen } from "./GameScreen";

export default function CrosshatchPage() {
  // The mounted date. Crossing midnight with the app open (or resuming
  // an iOS PWA on a new day) must remount onto the new puzzle — useToday
  // owns rollover.
  const dateKey = useToday();
  // The day opens on the normal board — the one every day has had.
  const [level, setLevel] = useState<Level>("normal");

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
