import { Tile, TileSocket } from "../../../components/game/Tile";

/**
 * Hub-card miniature of the tutorial board's top four rows: LISTEN
 * across in the accent, and the hidden word's column above it as empty
 * dashed sockets — a clued word and one still to find, crossing, which
 * is the game. The gap after the third column is the box edge, so it
 * reads as a sudoku rather than a word block.
 */
const TILE = 13;
const ROWS = ["tlinse", "senlit", "ntesli", "listen"];
const CLUED_ROW = 3;
const HIDDEN_COL = 4;

export function AnagridPreview() {
  return (
    <div className="flex flex-col gap-[2px] pt-1" aria-hidden>
      {ROWS.map((row, r) => (
        <div key={r} className={`flex gap-[2px] ${r === 2 ? "mt-[3px]" : ""}`}>
          {[...row].map((ch, c) => {
            const style = { width: TILE, height: TILE, marginLeft: c === 3 ? 3 : 0 };
            if (c === HIDDEN_COL && r !== CLUED_ROW) {
              return <TileSocket key={c} className="rounded border-[1.5px]" style={style} />;
            }
            return (
              <Tile
                key={c}
                mini
                tone={r === CLUED_ROW ? "accent" : "surface"}
                className={r === CLUED_ROW ? "" : "shadow-sm"}
                style={style}
              >
                {ch}
              </Tile>
            );
          })}
        </div>
      ))}
    </div>
  );
}
