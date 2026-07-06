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
  return (
    <div
      className="grid gap-[3px]"
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
