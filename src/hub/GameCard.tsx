import { Link } from "react-router-dom";
import type { GameDefinition } from "../games/types";

export function GameCard({ game }: { game: GameDefinition }) {
  return (
    <Link
      to={`/games/${game.id}`}
      className="block overflow-hidden rounded-3xl border border-line bg-surface-raised transition-transform active:scale-[0.98]"
    >
      <div className="flex h-40 items-center justify-center bg-accent-soft">
        <game.Preview />
      </div>
      <div className="px-5 py-4">
        <h2 className="text-xl font-semibold">{game.name}</h2>
        <p className="mt-0.5 text-sm text-ink-soft">{game.tagline}</p>
        {game.Status && <game.Status />}
      </div>
    </Link>
  );
}
