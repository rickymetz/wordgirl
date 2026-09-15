import { useEffect, useRef } from "react";

interface Particle {
  /** Launch point and initial velocity, in px and px/second. */
  x0: number;
  y0: number;
  vx0: number;
  vy0: number;
  rotation0: number;
  /** Radians per second. */
  rotationSpeed: number;
  w: number;
  h: number;
  color: string;
  shape: "rect" | "star";
  /** ms after mount before this particle launches. */
  delay: number;
}

/**
 * The palette lives in index.css as light-dark() pairs, because a confetti
 * piece is a small patch of flat fill with no outline: a hue that merely
 * reads light on a white page vanishes rather than looking washed out.
 * Canvas can't resolve var(), so the tokens are named here and read once
 * at mount (see resolvePalette).
 */
const CONFETTI_TOKENS = {
  rainbow: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `--confetti-${n}`),
  gold: [1, 2, 3, 4, 5].map((n) => `--confetti-gold-${n}`),
} as const;

type PaletteName = keyof typeof CONFETTI_TOKENS | "rainbowGold";
type Palette = Record<keyof typeof CONFETTI_TOKENS, string[]>;

/**
 * Resolve the tokens to concrete colors for the theme in force right now.
 * getComputedStyle on an unregistered custom property hands back the
 * literal `light-dark(...)` text, so each token is read through a probe
 * element whose `color` the engine has already resolved for us.
 *
 * A token that resolves to nothing is dropped rather than defaulted: the
 * house rule is that no component hardcodes a hex, and confetti is pure
 * decoration, so the honest failure mode is fewer colors (or none, and no
 * confetti) rather than a second copy of the palette living in here.
 */
function resolvePalette(): Palette {
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.position = "fixed";
  probe.style.opacity = "0";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);
  const read = (tokens: readonly string[]) =>
    tokens
      .map((token) => {
        probe.style.color = "";
        probe.style.color = `var(${token})`;
        return window.getComputedStyle(probe).color;
      })
      .filter((color) => color !== "");
  try {
    return { rainbow: read(CONFETTI_TOKENS.rainbow), gold: read(CONFETTI_TOKENS.gold) };
  } finally {
    probe.remove();
  }
}

/** Each particle's own airtime, from launch to faded out. */
const LIFE = 1400;
/**
 * Physics in per-SECOND units so position is a function of time rather
 * than of how many frames happened to render (see the frame loop). These
 * are the original per-frame values converted at 60fps — 0.35 px/frame²
 * of gravity and a 0.99-per-frame horizontal drag — so the motion is
 * unchanged on a 60Hz screen and now identical everywhere else.
 */
const GRAVITY = 1260; // px/s²
const DRAG = 0.603; // s⁻¹, = -ln(0.99) · 60

export type ConfettiVariant = "burst" | "grand";

interface Burst {
  /** Origin as fractions of the viewport. */
  fx: number;
  fy: number;
  count: number;
  delay: number;
  palette: PaletteName;
  /** Chance a piece is a star instead of a rectangle. */
  starChance: number;
  /** Aim the burst: base launch angle (radians) and spread around it.
   *  Omitted = a full-circle pop, which also gets an upward bias. */
  angle?: number;
  spread?: number;
  /** Random speed ABOVE a fixed floor: `4 + random() * speedRange`
   *  px/frame-at-60fps. Not a speed on its own. */
  speedRange: number;
  /** Smear the launches over this many ms. A wide-origin pop needs none,
   *  but an AIMED burst leaves a single point in a narrow cone, and firing
   *  all of it on one frame reads as a hard-edged smear rather than a
   *  cannon. Adds to the sequence's total run time. */
  jitter?: number;
}

/** The everyday single pop, and what every game's solve screen shows. */
const BURST: Burst[] = [
  { fx: 0.5, fy: 0.45, count: 80, delay: 0, palette: "rainbow", starChance: 0, speedRange: 8 },
];

/**
 * The perfect-day sequence. Two things it has to get right, both learned
 * the hard way: the gold has to be unmistakable in the FIRST beat (the
 * only moment the player is guaranteed to be looking — an opening pop
 * that matches the everyday burst spends it), and the two side cannons
 * fire TOGETHER and from inside the frame, or they read as a stutter and
 * a smear clamped to the edge rather than as a pair of cannons.
 */
const GRAND: Burst[] = [
  { fx: 0.5, fy: 0.45, count: 110, delay: 0, palette: "rainbowGold", starChance: 0.45, speedRange: 8 },
  { fx: 0.08, fy: 0.72, count: 55, delay: 250, palette: "gold", starChance: 0.35, angle: -Math.PI * 0.3, spread: Math.PI * 0.22, speedRange: 11, jitter: 120 },
  { fx: 0.92, fy: 0.72, count: 55, delay: 250, palette: "gold", starChance: 0.35, angle: -Math.PI * 0.7, spread: Math.PI * 0.22, speedRange: 11, jitter: 120 },
  { fx: 0.5, fy: 0.4, count: 80, delay: 700, palette: "gold", starChance: 0.5, speedRange: 9 },
];

const SEQUENCES: Record<ConfettiVariant, Burst[]> = { burst: BURST, grand: GRAND };

/**
 * Total run time per variant, DERIVED from the sequences rather than
 * restated: the last launch (jitter included) plus one lifetime. Mounters
 * that unmount the canvas on a timer read this, so adding a later burst
 * can't silently truncate it.
 */
export const CONFETTI_DURATION: Record<ConfettiVariant, number> = {
  burst: lastLaunch(BURST) + LIFE,
  grand: lastLaunch(GRAND) + LIFE,
};

function lastLaunch(bursts: Burst[]): number {
  return Math.max(...bursts.map((b) => b.delay + (b.jitter ?? 0)));
}

/**
 * Which variant to actually draw. The grand sequence is ~4x the geometry
 * of the burst over ~1.5x the time, and this banner already pares its own
 * animated glow back on constrained devices (`prefers-reduced-data` and
 * the boot-time `html[data-low-power]` guess — there is no CSS query for
 * device power). Confetti is the more expensive of the two effects, so it
 * gates the same way: keep the everyday pop, drop the expensive tier.
 */
export function resolveConfettiVariant(requested: ConfettiVariant): ConfettiVariant {
  if (requested === "burst") return "burst";
  const reducedData = window.matchMedia("(prefers-reduced-data: reduce)").matches;
  const lowPower = document.documentElement.dataset.lowPower === "true";
  return reducedData || lowPower ? "burst" : "grand";
}

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
 * zero hints, so it stays special, and downgraded to `burst` on a
 * constrained device. Renders nothing under `prefers-reduced-motion`,
 * which means it can never be the ONLY thing marking an achievement.
 * Mount it when the celebration starts and unmount after
 * `CONFETTI_DURATION[resolveConfettiVariant(variant)]`.
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

    const drawn = resolveConfettiVariant(variant);
    // `data-confetti` is the tier the CALLER asked for; this is the one
    // actually drawn, which differs on a constrained device. Keeping them
    // apart means neither attribute can quietly lie about the other.
    canvas.dataset.confettiDrawn = drawn;
    const palette = resolvePalette();
    const pick = (name: PaletteName): string[] =>
      name === "rainbowGold"
        ? // Gold twice over so the opening pop reads as gold-with-confetti
          // rather than confetti-with-a-few-gold-pieces.
          [...palette.rainbow, ...palette.gold, ...palette.gold]
        : palette[name];
    if (palette.rainbow.length === 0 && palette.gold.length === 0) return;

    // Cap the backing store: a full-screen layer at DPR 3 is ~3M px
    // cleared and recomposited every frame, and confetti gains nothing
    // visible from the third pixel.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const particles: Particle[] = [];
    for (const burst of SEQUENCES[drawn]) {
      const colors = pick(burst.palette);
      if (colors.length === 0) continue;
      for (let i = 0; i < burst.count; i++) {
        const aimed = burst.angle !== undefined;
        const angle = aimed
          ? burst.angle! + (Math.random() - 0.5) * 2 * (burst.spread ?? 0)
          : Math.random() * Math.PI * 2;
        // px/frame-at-60fps, converted to px/s below.
        const speed = 4 + Math.random() * burst.speedRange;
        particles.push({
          x0: burst.fx * w + (Math.random() - 0.5) * 60,
          y0: burst.fy * h,
          vx0: Math.cos(angle) * speed * 60,
          vy0: (Math.sin(angle) * speed - (aimed ? 0 : 6)) * 60,
          rotation0: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.21 * 60,
          w: 6 + Math.random() * 6,
          h: 4 + Math.random() * 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          shape: Math.random() < burst.starChance ? "star" : "rect",
          delay: burst.delay + Math.random() * (burst.jitter ?? 0),
        });
      }
    }

    const duration = CONFETTI_DURATION[drawn];
    let raf: number;
    let start = performance.now();
    let hiddenAt: number | null = null;

    // rAF does not tick in a hidden tab, so without this the clock runs on
    // while nothing draws and a staggered burst can have its whole window
    // elapse unseen. Pausing it (the same thing useDailyClock does for
    // active play time) means backgrounding defers the sequence instead of
    // eating it.
    function onVisibility() {
      if (document.hidden) {
        hiddenAt = performance.now();
      } else if (hiddenAt !== null) {
        start += performance.now() - hiddenAt;
        hiddenAt = null;
        raf = requestAnimationFrame(frame);
      }
    }

    function frame(now: number) {
      if (document.hidden) return; // resumed by onVisibility
      const elapsed = now - start;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, h);

      for (const p of particles) {
        const t = (elapsed - p.delay) / LIFE;
        if (t < 0 || t >= 1) continue;

        // Position is a closed-form function of the particle's own age,
        // not an accumulator advanced once per rendered frame. That keeps
        // the arc identical at 30, 60 and 120Hz (where per-frame
        // integration doubled the travel and halved the visible airtime)
        // and lets a dropped or skipped frame cost a frame of animation
        // rather than displacing everything after it.
        const a = (t * LIFE) / 1000;
        const x = p.x0 + (p.vx0 / DRAG) * (1 - Math.exp(-DRAG * a));
        const y = p.y0 + p.vy0 * a + 0.5 * GRAVITY * a * a;

        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx!.translate(x, y);
        ctx!.rotate(p.rotation0 + p.rotationSpeed * a);
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

    // Mounted while hidden (a phone that locked on the way here): start
    // the clock paused, so the run plays in full on return rather than
    // arriving already expired.
    if (document.hidden) hiddenAt = start;
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(raf);
    };
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
