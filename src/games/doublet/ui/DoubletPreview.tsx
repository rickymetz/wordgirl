const CELLS: (string | null)[][] = [
  ["T", "I", "L"],
  ["E", null, "E"],
  ["W", "O", "R"],
];

export function DoubletPreview() {
  return (
    <div
      className="grid gap-[3px]"
      style={{ gridTemplateColumns: "repeat(3, 22px)" }}
      aria-hidden
    >
      {CELLS.flat().map((letter, i) =>
        letter === null ? (
          <div key={i} />
        ) : (
          <div
            key={i}
            className={`flex h-[22px] items-center justify-center rounded font-game text-[10px] ${
              i < 3 ? "bg-accent text-surface" : "bg-surface text-ink"
            }`}
          >
            {letter}
          </div>
        ),
      )}
    </div>
  );
}
