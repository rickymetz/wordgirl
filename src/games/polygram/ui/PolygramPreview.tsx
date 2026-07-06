/** Static hub-card preview: the edge-flush triangle board in miniature. */
export function PolygramPreview() {
  // Central apex-up triangle, circumradius 26; flipped tiles flush on
  // each edge (Triforce arrangement), matching the real board geometry.
  const R = 26;
  const a = R * Math.cos(Math.PI / 3); // apothem
  const seam = 2;
  const tri = (r: number, rot: number) => {
    const pts = [0, 1, 2]
      .map((k) => {
        const angle = ((-90 + k * 120 + rot) * Math.PI) / 180;
        return `${(r * Math.cos(angle)).toFixed(1)},${(r * Math.sin(angle)).toFixed(1)}`;
      })
      .join(" ");
    return pts;
  };
  const tiles = [0, 1, 2].map((i) => {
    const angle = ((-90 + (i + 0.5) * 120) * Math.PI) / 180;
    const d = 2 * a + seam;
    return [60 + d * Math.cos(angle), 62 + d * Math.sin(angle)] as const;
  });

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
      {tiles.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <polygon points={tri(R, 180)} fill="var(--color-accent)" opacity="0.3" />
          <text
            textAnchor="middle"
            dy="1"
            fontSize="13"
            fontWeight="bold"
            fill="var(--color-ink)"
          >
            {["W", "R", "D"][i]}
          </text>
        </g>
      ))}
      <g transform="translate(60 62)">
        <polygon points={tri(R, 0)} fill="var(--color-accent)" />
        <circle cx="-4" cy="4" r="2.2" fill="var(--color-surface)" />
        <circle cx="4" cy="4" r="2.2" fill="var(--color-surface)" />
      </g>
    </svg>
  );
}
