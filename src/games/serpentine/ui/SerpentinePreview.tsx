/**
 * Bento-card miniature: a 4×4 letter grid with a snake path (circles +
 * pipes) partially traced through it, plus one blocked cell — the three
 * elements that define Serpentine's visual identity.
 */

const COLS = 4;
const ROWS = 4;
const CELL = 16;
const W = COLS * CELL;
const H = ROWS * CELL;
const R = 0.34;
const PIPE = 0.28;

const GRID: (string | null)[][] = [
  ["S", "N", "A", "K"],
  ["P", "O", "E", "T"],
  ["R", "Y", null, "H"],
  ["I", "N", "E", "S"],
];

const PATH: [number, number][] = [
  [0, 0], [0, 1], [0, 2], [1, 2], [1, 1], [1, 0],
  [2, 0], [2, 1],
];

const claimed = new Set(PATH.map(([r, c]) => `${r},${c}`));

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

      {/* Letters */}
      {GRID.flatMap((row, r) =>
        row.map((ch, c) => {
          if (ch === null) return null;
          const onPath = claimed.has(`${r},${c}`);
          return (
            <text
              key={`${r},${c}`}
              x={c + 0.5}
              y={r + 0.5}
              dy="0.36em"
              textAnchor="middle"
              fill={onPath ? "var(--color-surface)" : "var(--color-ink)"}
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
