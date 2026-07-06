import { Link } from "react-router-dom";
import type { GameDefinition } from "../games/types";

/**
 * Bento cluster per game: a large tile for the primary mode (the daily
 * puzzle) and a grid of smaller tiles for secondary modes below it.
 */
export function GameCard({ game }: { game: GameDefinition }) {
  return (
    <section>
      <Link
        to={`/games/${game.id}`}
        className="flex items-center overflow-hidden rounded-3xl bg-accent-soft px-6 py-7 transition-transform active:scale-[0.98]"
      >
        <div className="w-3/4 min-w-0 pr-2">
          {game.primaryLabel && (
            <div className="text-xs font-semibold tracking-widest text-accent uppercase">
              {game.primaryLabel}
            </div>
          )}
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            {game.name}
          </h2>
          <p className="mt-0.5 text-sm text-ink-soft">{game.tagline}</p>
          {game.Status && <game.Status />}
        </div>
        <div className="flex w-1/4 justify-center">
          <game.Preview />
        </div>
      </Link>
      {game.secondaryActions && (
        <div
          className="-mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {game.secondaryActions.map((action) => (
            <Link
              key={action.path}
              to={`/games/${game.id}/${action.path}`}
              className="w-40 shrink-0 rounded-2xl border border-line bg-surface-raised px-5 py-4 transition-transform active:scale-[0.97]"
            >
              <div className="font-semibold text-accent">{action.label}</div>
              {action.description && (
                <div className="mt-0.5 text-xs text-ink-soft">
                  {action.description}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
