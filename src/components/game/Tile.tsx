import type { CSSProperties, ReactNode } from "react";

/**
 * The letter tile — the atom every game's board, rack, keyboard, and
 * bento miniature is built from. Four tones cover the codebase:
 *
 * - "tile":    a resting letter on a plain surface (warm grey).
 * - "surface": a letter ON a tinted panel — the punch-out the house
 *              color rules require (never bg-tile on tint).
 * - "accent":  a highlighted letter (hub preview headlines).
 * - "ghost":   a reflection/preview reading — translucent, soft ink.
 *
 * Motion-wrapped tiles (layoutId flights, drag) can't nest a
 * component without breaking their animations: give the motion
 * element `tileClasses(tone)` instead and keep the visuals in sync.
 */
export type TileTone = "tile" | "surface" | "accent" | "ghost";

const TONES: Record<TileTone, string> = {
  tile: "bg-tile text-ink",
  surface: "bg-surface text-ink",
  accent: "bg-accent text-surface",
  ghost: "bg-surface/70 text-ink-soft",
};

export function tileClasses(tone: TileTone, mini = false): string {
  return `flex shrink-0 items-center justify-center font-game uppercase ${
    mini ? "rounded text-[8px]" : "rounded-lg"
  } ${TONES[tone]}`;
}

export function Tile({
  tone = "tile",
  mini = false,
  className = "",
  style,
  children,
}: {
  tone?: TileTone;
  /** Bento-card miniature sizing (tiny radius + 8px glyphs). */
  mini?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div className={`${tileClasses(tone, mini)} ${className}`} style={style}>
      {children}
    </div>
  );
}

/** An empty dashed socket — a tile's home while it's out on the board.
 * `subdued` is the in-glass twin (fainter line on the tinted pane). */
export function TileSocket({
  subdued = false,
  className = "",
  style,
}: {
  subdued?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className={`shrink-0 rounded-lg border-2 border-dashed ${
        subdued ? "border-ink-soft/25" : "border-line"
      } ${className}`}
      style={style}
    />
  );
}
