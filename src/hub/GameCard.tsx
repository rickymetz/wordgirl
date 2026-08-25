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
        <div className="mt-3 flex gap-1.5 md:mt-0 md:w-36 md:shrink-0 md:flex-col md:gap-3">
          {game.secondaryActions.map((action) => (
            <Link
              key={action.path}
              to={`/games/${game.id}/${action.path}`}
              // Phone: one row of equal tiles (flex-1), each a centered
              // label — no horizontal scroller, so all four stay on screen
              // and reachable without a gesture (the fourth, Tutorial, is a
              // player's only visible way back to it once the first-visit
              // prompt is answered). Labels are short and shrink to text-xs
              // so four fit a 390px card; min-h-11 holds the 44px touch
              // floor, and it is rem-based so it scales with the Text-size
              // setting. (At 320px + Huge text the row can still overflow —
              // the app-wide narrow-Huge gap, not specific to this cluster.)
              //
              // md+ stacks the same tiles into a column beside the primary
              // tile; flex-1 divides the cluster height, min-h-11 keeps the
              // floor so four actions can't fall under it (820px tablets hit
              // this breakpoint), and the label goes left-aligned.
              className="flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-2xl bg-surface-tint px-1.5 py-2 text-center transition-transform active:scale-[0.97] md:justify-start md:px-4 md:py-0 md:text-left"
            >
              {/* break-words + the tile's min-w-0: at the narrowest widths
                  (320px × Huge) a label wraps to a second line instead of
                  pushing the row off screen. */}
              <div className="font-semibold text-accent text-xs break-words md:text-base">
                {action.label}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
