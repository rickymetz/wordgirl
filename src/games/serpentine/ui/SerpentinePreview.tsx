/**
 * Bento-card miniature: a 4×3 letter grid with two blocked corners and
 * a Hamiltonian snake path covering every live cell — the three visual
 * signatures of Serpentine. The path includes diagonal moves, visits
 * every non-blocked cell exactly once, and spells "SERPENTINE" — a
 * real hidden phrase, matching the actual game rules.
 */

const COLS = 4;
const ROWS = 3;
const W = COLS * 16;
const H = ROWS * 16;
const R = 0.34;
const PIPE = 0.28;

// Path spells SERPENTINE reading along the snake.
const GRID: (string | null)[][] = [
  [null, "R", "E", "S"],
  ["P", "E", "N", "T"],
  ["E", "N", "I", null],
];

// Hamiltonian path through all 10 live cells, with diagonal moves.
// S → E → R → P → E → N → T → I → N → E
const PATH: [number, number][] = [
  [0, 3], [0, 2], [0, 1],
  [1, 0], [1, 1], [1, 2], [1, 3],
  [2, 2], [2, 1], [2, 0],
];

export function SerpentinePreview() {
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${COLS} ${ROWS}`}
      className="overflow-visible"
      aria-hidden
    >
      {/* Snake path: pipes then circles */}
      {PATH.map(([r, c], i) => {
        if (i === 0) return null;
        const [pr, pc] = PATH[i - 1];
        return (
          <line
            key={`p${i}`}
            x1={pc + 0.5}
            y1={pr + 0.5}
            x2={c + 0.5}
            y2={r + 0.5}
            stroke="var(--color-accent)"
            strokeWidth={PIPE}
            strokeLinecap="round"
          />
        );
      })}
      {PATH.map(([r, c], i) => (
        <circle
          key={`n${i}`}
          cx={c + 0.5}
          cy={r + 0.5}
          r={R}
          fill="var(--color-accent)"
        />
      ))}

      {/* Letters — all on path, so all surface-colored */}
      {GRID.flatMap((row, r) =>
        row.map((ch, c) => {
          if (ch === null) return null;
          return (
            <text
              key={`${r},${c}`}
              x={c + 0.5}
              y={r + 0.5}
              dy="0.36em"
              textAnchor="middle"
              fill="var(--color-surface)"
              style={{ fontSize: "0.42px", fontWeight: 700 }}
              className="font-game"
            >
              {ch}
            </text>
          );
        }),
      )}
    </svg>
  );
}
