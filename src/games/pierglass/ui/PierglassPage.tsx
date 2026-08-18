import { useToday } from "../../../lib/useToday";
import { GameScreen } from "./GameScreen";

export default function PierglassPage() {
  // Crossing midnight with the app open (or resuming an iOS PWA on a
  // new day) remounts onto the new puzzle — useToday owns rollover.
  const dateKey = useToday();
  return <GameScreen key={dateKey} mode={{ kind: "daily", dateKey }} />;
}
