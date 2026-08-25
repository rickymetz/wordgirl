import { Link } from "react-router-dom";
import type { GameDefinition } from "../games/types";

/**
 * Bento cluster per game: a large tile for the primary mode (the daily
 * puzzle) and, UNDER it, a horizontal scroller of secondary modes. Neutral
 * card surfaces — color comes from the game's accent level and its preview
 * art, matching the in-game look (grey petals, one saturated center).
 */
export function GameCard({ game }: { game: GameDefinition }) {
  return (
    <section data-level={game.accentLevel}>
      <Link
        to={`/games/${game.id}`}
        className="flex items-center overflow-hidden rounded-3xl bg-surface-tint px-6 py-6 transition-transform active:scale-[0.98]"
      >
        <div className="w-3/4 min-w-0 pr-2">
          <h2 className="font-game text-2xl font-normal tracking-tight">{game.name}</h2>
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
        // A single fixed-width row under the card, scrolled horizontally at
        // every width. Each button is ~40% of the row, so two sit full and
        // the third is clipped at the right edge — the peek IS the "there's
        // more, scroll" cue. `.card-action-scroller` hides the scrollbar and
        // fades that right edge; snap keeps a button from resting
        // half-clipped after a flick.
        <div className="card-action-scroller mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto">
          {game.secondaryActions.map((action) => (
            <Link
              key={action.path}
              to={`/games/${game.id}/${action.path}`}
              className="flex min-h-11 w-[37%] flex-none snap-start items-center justify-center rounded-2xl bg-surface-tint px-4 py-3 text-center transition-transform active:scale-[0.97]"
            >
              <span className="font-semibold text-accent whitespace-nowrap">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
