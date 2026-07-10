import { useState } from "react";
import { useToday } from "../../../lib/useToday";
import { GameScreen } from "./GameScreen";
import type { Difficulty } from "../engine/types";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export default function SerpentinePage() {
  const dateKey = useToday();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  return (
    <div
      data-level="serpentine"
      className="flex grow flex-col"
    >
      {/* Difficulty picker */}
      <div className="mx-auto flex w-full max-w-md gap-1 px-5 pt-4">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDifficulty(d)}
            className={`flex-1 rounded-lg py-1.5 text-center text-sm font-semibold transition-colors touch-manipulation ${
              d === difficulty
                ? "bg-accent text-surface"
                : "bg-surface-tint text-ink-soft"
            }`}
          >
            {LABELS[d]}
          </button>
        ))}
      </div>
      <GameScreen
        key={`${dateKey}:${difficulty}`}
        mode={{ kind: "daily", dateKey, difficulty }}
      />
    </div>
  );
}
