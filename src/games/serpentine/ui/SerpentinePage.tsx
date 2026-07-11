import { useState } from "react";
import { useToday } from "../../../lib/useToday";
import type { Difficulty } from "../engine/types";
import { GameScreen } from "./GameScreen";

export default function SerpentinePage() {
  const dateKey = useToday();
  const [difficulty, setDifficulty] = useState<Difficulty>("haiku");

  return (
    <GameScreen
      key={`${dateKey}-${difficulty}`}
      mode={{ kind: "daily", dateKey, difficulty }}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
    />
  );
}
