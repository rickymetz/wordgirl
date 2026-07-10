export function DoubletPreview() {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "repeat(3, 22px)",
        gridTemplateRows: "repeat(4, 22px)",
        gap: "3px",
      }}
      aria-hidden
    >
      <Domino letters={["D", "O"]} dir="H" row="1" col="1 / span 2" accent />
      <Domino letters={["U", "B"]} dir="V" row="2 / span 2" col="2" />
      <Domino letters={["L", "E"]} dir="H" row="4" col="2 / span 2" />

      <div
        className="bg-surface-tint rounded"
        style={{ gridRow: 2, gridColumn: 1 }}
      />
      <div
        className="bg-surface-tint rounded"
        style={{ gridRow: 3, gridColumn: 3 }}
      />
    </div>
  );
}

function Domino({
  letters,
  dir,
  row,
  col,
  accent,
}: {
  letters: [string, string];
  dir: "H" | "V";
  row: string;
  col: string;
  accent?: boolean;
}) {
  const isH = dir === "H";
  return (
    <div
      className={`flex items-center shadow-sm ${accent ? "bg-accent" : "bg-surface"}`}
      style={{
        gridRow: row,
        gridColumn: col,
        flexDirection: isH ? "row" : "column",
        border: `1px solid var(${accent ? "--color-accent" : "--color-line"})`,
        borderRadius: "4px",
      }}
    >
      <span className={`flex-1 flex items-center justify-center font-game text-[10px] ${accent ? "text-surface" : "text-ink"}`}>
        {letters[0]}
      </span>
      <div
        style={{
          ...(isH
            ? { width: "1px", alignSelf: "stretch", marginBlock: "3px" }
            : { height: "1px", alignSelf: "stretch", marginInline: "3px" }),
          backgroundColor: accent ? "var(--color-surface)" : "var(--color-line)",
          opacity: accent ? 0.3 : 0.35,
        }}
      />
      <span className={`flex-1 flex items-center justify-center font-game text-[10px] ${accent ? "text-surface" : "text-ink"}`}>
        {letters[1]}
      </span>
    </div>
  );
}
