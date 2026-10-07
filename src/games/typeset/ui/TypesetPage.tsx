import { useState } from "react";
import { useToday } from "../../../lib/useToday";
import type { BoardKind } from "../engine/schedule";
import { GameScreen } from "./GameScreen";

export default function TypesetPage() {
  // Crossing midnight with the app open (or resuming an iOS PWA on a new
  // day) remounts onto the new boards — useToday owns rollover.
  const dateKey = useToday();
  // The day opens on the character-set board; either order counts.
  const [board, setBoard] = useState<BoardKind>("charset");
  // Remount per board: each board has its own clock and its own save.
  return <GameScreen key={`${dateKey}:${board}`} mode={{ kind: "daily", dateKey, board }} onBoardChange={setBoard} />;
}
