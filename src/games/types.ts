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
  /** Lazy page component — each game is its own code-split chunk. */
  Page: LazyExoticComponent<ComponentType>;
  /** Extra routes under /games/<id>/, e.g. practice mode. */
  extraRoutes?: {
    path: string;
    Page: LazyExoticComponent<ComponentType>;
  }[];
}
