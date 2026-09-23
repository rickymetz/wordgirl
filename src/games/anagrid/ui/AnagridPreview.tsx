import { Tile } from "../../../components/game/Tile";

/**
 * Hub-card miniature of the tutorial board's top four rows: LISTEN
 * across in the accent, SILENT's column running down behind it as ghost
 * tiles — a clued word and a hidden one, crossing, which is the game.
 */
const TILE = 13;
const ROWS = ["tlinse", "senlit", "ntesli", "listen"];
const CLUED_ROW = 3;
const HIDDEN_COL = 4;

export function AnagridPreview() {
  return (
    <div className="flex flex-col gap-[2px] pt-1" aria-hidden>
      {ROWS.map((row, r) => (
        <div key={r} className="flex gap-[2px]">
          {[...row].map((ch, c) => (
            <Tile
              key={c}
              mini
              tone={r === CLUED_ROW ? "accent" : c === HIDDEN_COL ? "ghost" : "surface"}
              className={r === CLUED_ROW || c === HIDDEN_COL ? "" : "shadow-sm"}
              style={{ width: TILE, height: TILE }}
            >
              {ch}
            </Tile>
          ))}
        </div>
      ))}
    </div>
  );
}
