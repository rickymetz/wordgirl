import { useEffect, useState } from "react";
import { localDateKey } from "../../../lib/date";
import type { Difficulty } from "../engine/types";
import { GameScreen } from "./GameScreen";

export default function TilewordPage() {
  const [dateKey, setDateKey] = useState(() => localDateKey());
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

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

  return (
    <GameScreen
      key={`${dateKey}-${difficulty}`}
      mode={{ kind: "daily", dateKey, difficulty }}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
    />
  );
}
