import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  w: number;
  h: number;
  color: string;
  shape: "rect" | "star";
  /** ms after mount before this particle launches (staggered bursts). */
  delay: number;
}

const COLORS = [
  "#f472b6", "#fb923c", "#facc15", "#4ade80",
  "#60a5fa", "#a78bfa", "#f87171", "#34d399",
];
// The no-hints day reads as gold: warm metallics with a near-white glint.
const GOLDS = [
  "#fde047", "#facc15", "#fbbf24", "#f59e0b", "#fef9c3",
];

/** Each particle's own airtime from launch to faded-out. */
const LIFE = 1400;

export type ConfettiVariant = "burst" | "grand";

/**
 * Total run time per variant — the last burst's delay plus LIFE. Mounters
 * that unmount the canvas on a timer read this instead of hardcoding it.
 */
export const CONFETTI_DURATION: Record<ConfettiVariant, number> = {
  burst: LIFE,
  grand: 1200 + LIFE,
};

interface Burst {
  /** Origin as fractions of the viewport. */
  fx: number;
  fy: number;
  count: number;
  delay: number;
  colors: string[];
  /** Chance a piece is a star instead of a rectangle. */
  starChance: number;
  /** Aim the burst: base launch angle (radians) and spread around it.
   *  Omitted = a full-circle pop like the classic burst. */
  angle?: number;
  spread?: number;
  speed: number;
}

/** The classic single pop, unchanged from the original overlay. */
const BURST: Burst[] = [
  { fx: 0.5, fy: 0.45, count: 80, delay: 0, colors: COLORS, starChance: 0, speed: 8 },
];

/**
 * The perfect-day sequence: the familiar center pop first (so it clearly
 * contains the everyday celebration), then two gold side cannons firing
 * up and across, and a final gold-and-stars finale back at center.
 */
const GRAND: Burst[] = [
  { fx: 0.5, fy: 0.45, count: 80, delay: 0, colors: COLORS, starChance: 0.2, speed: 8 },
  { fx: 0.02, fy: 0.8, count: 60, delay: 400, colors: GOLDS, starChance: 0.35, angle: -Math.PI * 0.3, spread: Math.PI * 0.22, speed: 11 },
  { fx: 0.98, fy: 0.8, count: 60, delay: 700, colors: GOLDS, starChance: 0.35, angle: -Math.PI * 0.7, spread: Math.PI * 0.22, speed: 11 },
  { fx: 0.5, fy: 0.4, count: 70, delay: 1200, colors: GOLDS, starChance: 0.5, speed: 9 },
];

function starPath(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  ctx.closePath();
}

/**
 * A one-shot celebratory confetti burst over the whole screen. `variant`
 * picks the scale: `burst` (default) is the everyday single pop; `grand`
 * is the perfect-day sequence — reserved for finishing every puzzle with
 * zero hints, so it stays special. Respects `prefers-reduced-motion`
 * (renders nothing). Mount it when the celebration starts and unmount
 * after `CONFETTI_DURATION[variant]`.
 */
export function ConfettiOverlay({
  variant = "burst",
}: {
  variant?: ConfettiVariant;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const particles: Particle[] = [];
    for (const burst of variant === "grand" ? GRAND : BURST) {
      for (let i = 0; i < burst.count; i++) {
        const angle =
          burst.angle !== undefined
            ? burst.angle + (Math.random() - 0.5) * 2 * (burst.spread ?? 0)
            : Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * burst.speed;
        particles.push({
          x: burst.fx * w + (Math.random() - 0.5) * 60,
          y: burst.fy * h,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (burst.angle === undefined ? 6 : 0),
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.21,
          w: 6 + Math.random() * 6,
          h: 4 + Math.random() * 4,
          color: burst.colors[Math.floor(Math.random() * burst.colors.length)],
          shape: Math.random() < burst.starChance ? "star" : "rect",
          delay: burst.delay,
        });
      }
    }

    const duration = CONFETTI_DURATION[variant];
    const start = performance.now();
    let raf: number;

    function frame(now: number) {
      const elapsed = now - start;

      ctx!.clearRect(0, 0, w, h);

      for (const p of particles) {
        // Staggered bursts: a particle sits out until its burst fires, then
        // lives (and fades) on its own LIFE clock.
        const t = (elapsed - p.delay) / LIFE;
        if (t < 0 || t >= 1) continue;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;

        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rotation);
        ctx!.globalAlpha = 1 - t * t;
        ctx!.fillStyle = p.color;
        if (p.shape === "star") {
          starPath(ctx!, p.w * 0.75);
          ctx!.fill();
        } else {
          ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
      }

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.globalAlpha = 1;

      if (elapsed < duration) {
        raf = requestAnimationFrame(frame);
      }
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      data-confetti={variant}
      className="pointer-events-none fixed inset-0 z-50"
      aria-hidden
    />
  );
}
