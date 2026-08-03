import type { ComponentType, LazyExoticComponent } from "react";

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
