/**
 * Small deterministic PRNG: xmur3 string hash seeding mulberry32.
 * Used for daily puzzles (seeded by date) and practice (random seed) —
 * same generator, different seed, fully reproducible.
 */

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convenience: a [0,1) PRNG from any string seed. */
export function seededRandom(seed: string): () => number {
  return mulberry32(xmur3(seed)());
}

/** Deterministic in-place Fisher–Yates shuffle. */
export function shuffle<T>(items: T[], rand: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** Random seed string for practice mode. */
export function randomSeed(): string {
  const bytes = new Uint32Array(2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36)).join("");
}
