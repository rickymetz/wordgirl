import { Link } from "react-router-dom";
import type { GameDefinition } from "../games/types";

export function GameCard({ game }: { game: GameDefinition }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface-raised">
      <Link
        to={`/games/${game.id}`}
        className="block transition-transform active:scale-[0.98]"
      >
        <div className="flex h-40 items-center justify-center bg-accent-soft">
          <game.Preview />
        </div>
        <div className="px-5 pt-4 pb-3">
          <h2 className="text-xl font-semibold">{game.name}</h2>
          <p className="mt-0.5 text-sm text-ink-soft">{game.tagline}</p>
          {game.Status && <game.Status />}
        </div>
      </Link>
      {game.secondaryActions && (
        <div className="flex gap-2 px-5 pb-4">
          {game.secondaryActions.map((action) => (
            <Link
              key={action.path}
              to={`/games/${game.id}/${action.path}`}
              className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold text-accent active:scale-95"
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
