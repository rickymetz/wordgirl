/** Static hub-card preview: the flower triangle board in miniature. */
export function PolygramPreview() {
  const petalR = 26;
  const centerR = petalR * 0.62;
  const dist = petalR * 1.03;
  const tri = (r: number, rot: number) =>
    [0, 1, 2]
      .map((k) => {
        const angle = ((-90 + k * 120 + rot) * Math.PI) / 180;
        return `${(r * Math.cos(angle)).toFixed(1)},${(r * Math.sin(angle)).toFixed(1)}`;
      })
      .join(" ");
  const petals = [0, 1, 2].map((i) => {
    const deg = -90 + (i + 0.5) * 120;
    const rad = (deg * Math.PI) / 180;
    return {
      x: 60 + dist * Math.cos(rad),
      y: 62 + dist * Math.sin(rad),
      rot: deg + 90,
    };
  });

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
      {petals.map(({ x, y, rot }, i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <polygon points={tri(petalR, rot)} fill="var(--color-accent)" opacity="0.27" />
          <text
            textAnchor="middle"
            dy="4.5"
            fontSize="13"
            fontWeight="bold"
            fill="var(--color-accent)"
          >
            {["W", "R", "D"][i]}
          </text>
        </g>
      ))}
      <g transform="translate(60 62)">
        <polygon points={tri(centerR, 0)} fill="var(--color-accent)" />
        <text
          textAnchor="middle"
          dy="6"
          fontSize="9"
          fontWeight="bold"
          fill="var(--color-surface)"
        >
          3
        </text>
      </g>
    </svg>
  );
}
