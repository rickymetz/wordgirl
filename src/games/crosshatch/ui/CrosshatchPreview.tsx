import { useViewport } from "../../../lib/useViewport";

/**
 * Hub-card miniature: the ring skeleton filled with a real combo —
 * GAME / GRID / EDGE / DATE — one locked given in the corner.
 */
const CELLS: (string | null)[][] = [
  ["G", "A", "M", "E"],
  ["R", null, null, "D"],
  ["I", null, null, "G"],
  ["D", "A", "T", "E"],
];

export function CrosshatchPreview() {
  const { rem } = useViewport();
  // "Crosshatch" is one long word in the wide house face, so past the
  // default Text size it outgrows its column and runs under this grid's top
  // row — a card title reading through the tiles. Drop the grid clear of
  // that band, but only from the size where the two actually meet (measured
  // on the real build: the Large setting, rem 18) so the default card keeps
  // its centred art. 1.5rem is the most the card can give back: the space
  // under the art is what the text stack leaves, and a bigger shift pushes
  // the bottom tile row out through the card's clipped edge.
  const clearsTitle = rem >= 18;
  return (
    <div
      className={`grid gap-[3px] ${clearsTitle ? "translate-y-6" : ""}`}
      style={{ gridTemplateColumns: "repeat(4, 22px)" }}
      aria-hidden
    >
      {CELLS.flat().map((letter, i) =>
        letter === null ? (
          <div key={i} />
        ) : (
          <div
            key={i}
            className={`flex h-[22px] items-center justify-center rounded font-game text-[10px] ${
              i === 0 ? "bg-accent text-surface" : "bg-surface text-ink"
            }`}
          >
            {letter}
          </div>
        ),
      )}
    </div>
  );
}
