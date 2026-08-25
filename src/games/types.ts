import type { ComponentType, LazyExoticComponent } from "react";
import type { RoundupEntry } from "../lib/roundup";

export interface GameDefinition {
  /** Also the storage namespace and route segment: /games/<id> */
  id: string;
  name: string;
  tagline: string;
  /** Accent color used on the hub card. */
  themeColor: string;
  /** Small static preview rendered inside the hub card. */
  Preview: ComponentType;
  /** Optional one-line status on the hub card (streak, today's score…). */
  Status?: ComponentType;
  /**
   * Is this game's daily finished for `today`? Read by `DailyOutro` to
   * tell a player who just solved one game which others are still open.
   * A game without it counts as done, so a missing loader hides that
   * game from the list rather than advertising a puzzle already played.
   */
  solvedToday?: (today: string) => Promise<boolean>;
  /**
   * Today's result as one entry in the cross-game daily roundup, or null
   * when the game isn't finished for `today` (mirror `solvedToday`). Read
   * by `DailyRoundup`, which shows the roundup only once EVERY game
   * returns an entry — so a game that omits this loader keeps the roundup
   * from ever appearing, the same safe-by-omission stance `solvedToday`
   * takes. The emoji rides the SHARE string only; the UI card renders
   * `name · metric · time` with no emoji (house rule).
   */
  roundupEntry?: (today: string) => Promise<RoundupEntry | null>;
  /**
   * Every date this game was FULLY finished (all its boards), for the
   * cross-game "every puzzle done" streak the roundup shows. Intersecting
   * these sets across games and counting back from today gives the run of
   * days the whole set was cleared. Same safe-by-omission stance as the
   * others: a game without it can never be in the intersection, so the
   * streak would read 0 until it is added.
   */
  solvedDates?: () => Promise<string[]>;
  /** Lazy page component — each game is its own code-split chunk. */
  Page: LazyExoticComponent<ComponentType>;
  /** Extra routes under /games/<id>/, e.g. practice mode. */
  extraRoutes?: {
    path: string;
    Page: LazyExoticComponent<ComponentType>;
  }[];
  /** Palette key theming this game's hub cluster (data-level): a
   *  Polygram level number or a game's own key like "crosshatch". */
  accentLevel?: number | string;
  /** Secondary entry points rendered as small bento tiles on the hub. */
  secondaryActions?: { label: string; path: string; description?: string }[];
}
