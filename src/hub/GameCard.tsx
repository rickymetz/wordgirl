import { Link } from "react-router-dom";
import type { GameDefinition } from "../games/types";

/**
 * Bento cluster per game: a large tile for the primary mode (the daily
 * puzzle) and a row of smaller tiles for secondary modes. Neutral card
 * surfaces — color comes from the game's accent level and its preview
 * art, matching the in-game look (grey petals, one saturated center).
 */
export function GameCard({ game }: { game: GameDefinition }) {
  return (
    <section
      data-level={game.accentLevel}
      className="md:flex md:gap-3"
    >
      <Link
        to={`/games/${game.id}`}
        className="flex items-center overflow-hidden rounded-3xl bg-surface-tint px-6 py-6 transition-transform active:scale-[0.98] md:min-w-0 md:flex-1"
      >
        <div className="w-3/4 min-w-0 pr-2">
          <h2 className="text-2xl font-bold tracking-tight">{game.name}</h2>
          <p className="mt-0.5 text-sm text-ink-soft">{game.tagline}</p>
          {game.Status && <game.Status />}
        </div>
        <div className="w-1/4 shrink-0">
          <div className="w-32">
            <game.Preview />
          </div>
        </div>
      </Link>
      {game.secondaryActions && (
        <div
          className="-mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-1 md:mx-0 md:mt-0 md:w-36 md:shrink-0 md:flex-col md:overflow-x-visible md:px-0 md:pb-0"
          style={{ scrollbarWidth: "none" }}
        >
          {game.secondaryActions.map((action) => (
            <Link
              key={action.path}
              to={`/games/${game.id}/${action.path}`}
              className="w-40 shrink-0 rounded-2xl bg-surface-tint px-5 py-4 transition-transform active:scale-[0.97] md:w-auto md:flex-1 md:px-4 md:py-0 md:flex md:items-center"
            >
              <div className="font-semibold text-accent">{action.label}</div>
              {action.description && (
                <div className="mt-0.5 text-xs text-ink-soft md:hidden">
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
