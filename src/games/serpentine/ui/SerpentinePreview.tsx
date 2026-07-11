import { Tile } from "../../../components/game/Tile";

const LETTERS = [
  ["S", "E", "R"],
  ["N", "P", "E"],
  ["A", "K", "N"],
];
const TILE = 13;

export function SerpentinePreview() {
  return (
    <div className="flex flex-col gap-[3px] pt-1" aria-hidden>
      {LETTERS.map((row, r) => (
        <div key={r} className="flex gap-[2px]">
          {row.map((ch, c) => (
            <Tile
              key={c}
              mini
              tone={r === 1 ? "accent" : "surface"}
              className={r === 1 ? "" : "shadow-sm"}
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
