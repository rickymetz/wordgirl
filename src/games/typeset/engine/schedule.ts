/**
 * Which boards a date gets.
 *
 * Each pool (pool.ts) runs in CYCLES, the way Sixfold's schedule does:
 * cycle c is one seeded shuffle of every entry whose `since` <= c, so each
 * entry plays once per cycle and a cycle is as many days long as it has
 * entries. The two pools cycle independently, so the pairing of a
 * character set with a faces trio drifts day to day.
 *
 * The deal itself is seeded by the date and the board kind, so a day's
 * cards never move once the day has been played.
 */
import { seededRandom, shuffle } from "../../../lib/random";
import { FACES, type FaceId } from "./faces";
import { CHARSET_POOL, FACES_POOL, type Theme } from "./pool";
import { deal, type Card, type Triple } from "./sets";

/**
 * Bump whenever puzzle derivation changes (pool order, deal rules, seeds),
 * so saves made under the old derivation are recognized as stale.
 */
export const TYPESET_VERSION = 1;

export type BoardKind = "charset" | "faces";
export const BOARD_KINDS: readonly BoardKind[] = ["charset", "faces"];

/** What one value of the glyph attribute looks like and is called. */
export interface BoardGlyph {
  char: string;
  face: FaceId;
  name: string;
  plural: string;
}

export interface Board {
  kind: BoardKind;
  /** Tab and header label: the theme, or "Faces". */
  label: Theme | "Faces";
  glyphs: readonly [BoardGlyph, BoardGlyph, BoardGlyph];
  cards: Card[];
  sets: Triple[];
}

const EPOCH_UTC = Date.UTC(2026, 9, 1);
/** Seeds each cycle's shuffle and each deal. FROZEN. */
const SEED = "typeset";

function dayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH_UTC) / 86_400_000);
}

interface Slot<T> {
  entry: T;
  cycle: number;
}

/**
 * Walk the cycles to find a day's entry. Days before the epoch wrap into
 * cycle 0 (the archive never reaches them, but practice and tests may).
 */
export function scheduleSlot<T extends { since: number }>(pool: readonly T[], name: string, dateKey: string): Slot<T> {
  const poolFor = (cycle: number) => pool.filter((e) => e.since <= cycle);
  const order = (cycle: number, prev: readonly T[] | null) => {
    const o = shuffle(poolFor(cycle).slice(), seededRandom(`${SEED}:${name}:cycle:${cycle}`));
    return prev ? spaceFromPrevious(o, prev) : o;
  };
  const d = dayIndex(dateKey);
  if (d < 0) {
    const o = order(0, null);
    return { entry: o[((d % o.length) + o.length) % o.length], cycle: 0 };
  }
  let start = 0;
  let prev: T[] | null = null;
  for (let cycle = 0; ; cycle++) {
    const o = order(cycle, prev);
    if (d < start + o.length) return { entry: o[d - start], cycle };
    start += o.length;
    prev = o;
  }
}

/** How many days must separate an entry's plays across a cycle boundary. */
const MIN_GAP = 3;

/**
 * A fresh shuffle can open with the entries the previous cycle closed on,
 * replaying a board two days apart. Move any of the previous cycle's last
 * MIN_GAP entries out of this cycle's first MIN_GAP slots (to just after
 * them, keeping the rest of the shuffle's order). Deterministic, and it
 * only reads earlier cycles, so it never moves a day already played.
 */
function spaceFromPrevious<T>(order: T[], prev: readonly T[]): T[] {
  const recent = new Set(prev.slice(-MIN_GAP));
  if (order.length <= 2 * MIN_GAP) return order;
  const head = order.slice(0, MIN_GAP);
  const moved = head.filter((e) => recent.has(e));
  if (moved.length === 0) return order;
  const rest = order.slice(MIN_GAP);
  const fill = rest.filter((e) => !recent.has(e)).slice(0, moved.length);
  const newHead = [...head.filter((e) => !recent.has(e)), ...fill];
  const tail = rest.filter((e) => !fill.includes(e));
  return [...newHead, ...moved, ...tail];
}

function charsetGlyphs(entry: (typeof CHARSET_POOL)[number]): Board["glyphs"] {
  return entry.chars.map((c) => ({ char: c.char, face: entry.face, name: c.name, plural: c.plural })) as unknown as Board["glyphs"];
}

function facesGlyphs(entry: (typeof FACES_POOL)[number]): Board["glyphs"] {
  return entry.faces.map((face) => ({
    char: entry.char.char,
    face,
    name: `${FACES[face].name} ${entry.char.name}`,
    plural: `${FACES[face].name} ${entry.char.plural}`,
  })) as unknown as Board["glyphs"];
}

/** A day's board of one kind. */
export function dailyBoard(dateKey: string, kind: BoardKind): Board {
  if (kind === "charset") {
    const { entry, cycle } = scheduleSlot(CHARSET_POOL, "charset", dateKey);
    const { cards, sets } = deal(seededRandom(`${SEED}:deal:${dateKey}:${kind}:${cycle}`));
    return { kind, label: entry.theme, glyphs: charsetGlyphs(entry), cards, sets };
  }
  const { entry, cycle } = scheduleSlot(FACES_POOL, "faces", dateKey);
  const { cards, sets } = deal(seededRandom(`${SEED}:deal:${dateKey}:${kind}:${cycle}`));
  return { kind, label: "Faces", glyphs: facesGlyphs(entry), cards, sets };
}

/** A practice board: any pool entry, any deal, from a random seed. */
export function practiceBoard(kind: BoardKind, seed: string): Board {
  const rand = seededRandom(`${SEED}:practice:${kind}:${seed}`);
  if (kind === "charset") {
    const entry = CHARSET_POOL[Math.floor(rand() * CHARSET_POOL.length)];
    return { kind, label: entry.theme, glyphs: charsetGlyphs(entry), ...deal(rand) };
  }
  const entry = FACES_POOL[Math.floor(rand() * FACES_POOL.length)];
  return { kind, label: "Faces", glyphs: facesGlyphs(entry), ...deal(rand) };
}
