import { useToday } from "../../../lib/useToday";
import { GameScreen } from "./GameScreen";

export default function PolygramPage() {
  // Crossing midnight with the app open (or resuming an iOS PWA on a
  // new day) remounts onto the new puzzle — playing on with a stale
  // board would save yesterday's progress under today's key. useToday
  // owns rollover.
  const dateKey = useToday();
  return <GameScreen key={dateKey} mode={{ kind: "daily", dateKey }} />;
}
