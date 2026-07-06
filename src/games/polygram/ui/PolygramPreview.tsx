/**
 * Static hub-card preview: the triangle-level flower exactly as it looks
 * in-game — grey petals with ink letters spelling F-U-N around a
 * saturated center showing a count.
 */
export function PolygramPreview() {
  // Real board proportions for n=3: petal R, center 0.62R, ring 1.03R.
  const R = 29;
  const centerR = R * 0.62;
  const dist = R * 1.03;
  const tri = (r: number, rotDeg: number) =>
    [0, 1, 2]
      .map((k) => {
        const angle = ((-90 + k * 120 + rotDeg) * Math.PI) / 180;
        return `${(r * Math.cos(angle)).toFixed(1)},${(r * Math.sin(angle)).toFixed(1)}`;
      })
      .join(" ");
  // Petals point outward radially, matching the game board.
  const petals = ["U", "N", "F"].map((letter, i) => {
    const deg = -90 + (i + 0.5) * 120;
    const rad = (deg * Math.PI) / 180;
    return {
      letter,
      x: 60 + dist * Math.cos(rad),
      y: 62 + dist * Math.sin(rad),
      rot: deg + 90,
    };
  });

  return (
    // Scales to its container — the hub bento sizes (and clips) it.
    <svg width="100%" viewBox="0 0 120 120" aria-hidden>
      {petals.map(({ letter, x, y, rot }) => (
        <g key={letter} transform={`translate(${x} ${y})`}>
          <polygon points={tri(R, rot)} fill="var(--color-tile)" />
          <text
            textAnchor="middle"
            dy="4.5"
            fontSize="12"
            fontWeight="800"
            fill="var(--color-ink)"
          >
            {letter}
          </text>
        </g>
      ))}
      <g transform="translate(60 62)">
        <polygon points={tri(centerR, 0)} fill="var(--color-accent)" />
        <text
          textAnchor="middle"
          dy="6.5"
          fontSize="10"
          fontWeight="800"
          fill="var(--color-surface)"
        >
          3
        </text>
      </g>
    </svg>
  );
}
