import { formatDuration, formatShareDate, previousDateKey } from "./date";
import { SHARE_URL } from "./share";

/**
 * One game's contribution to the day's roundup. The game supplies the
 * pieces; the shared builder decides where the emoji is allowed to go —
 * the SHARE line leads with it, the UI card never shows it (emoji are a
 * share-string-only affordance, see the house rules). Keeping the emoji
 * a field rather than baking it into a string is what lets one function
 * honour that split for every game at once.
 */
/** One level (board) of a multi-level game: its label, its count, and the
 *  time on it. The banner renders one sub-row per level. */
export interface RoundupLevel {
  label: string; // "Normal", "Easy", "Haiku" …
  value: number; // the count (words/pieces/letters), unit on the entry
  elapsedMs: number;
}

export interface RoundupEntry {
  /** The game's share glyph, e.g. "🔻". SHARE line only. */
  emoji: string;
  /** Human game name, e.g. "Polygram". */
  name: string;
  /** Total active play time for the day across all of the game's boards. */
  elapsedMs: number;
  /** Hints used across the day's boards. Shown as the whole-day total. */
  hints: number;
  /** Single-board games: the ready stat, no emoji ("42 words", "6 rows"). */
  metric?: string;
  /** Multi-level games instead give a per-level breakdown + the shared
   *  unit ("words"/"pieces"/"letters"): the banner shows a sub-row per
   *  level, the share stays one inline line ("Normal 12 · Hard 13"). */
  unit?: string;
  levels?: RoundupLevel[];
}

/** Title-case a level/difficulty key ("hard" → "Hard") — the multi-level
 *  games build their per-level metric from this, matching each game's own
 *  labels (Normal/Hard, Easy/Medium/Hard, Haiku/Poem). */
export const capitalize = (s: string): string =>
  s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);

/** The hint tail: the count behind a peeking face, or the "no help" glyph
 *  at zero. SHARE strings only — used for the whole-day total, since the
 *  per-game lines now carry per-level metrics and stay to one line. */
function hintShare(hints: number): string {
  return hints > 0 ? `🫣 ${hints}` : "🤓 0";
}

/** The stat portion of an entry, no emoji: a single-board game's metric
 *  ("42 words"), or a multi-level game's inline per-level counts
 *  ("Normal 12 · Hard 13"). */
function statText(entry: RoundupEntry): string {
  if (entry.levels) {
    return entry.levels.map((l) => `${l.label} ${l.value}`).join(" · ");
  }
  return entry.metric ?? "";
}

/** The share glyph + name + stat + total time a single game contributes —
 *  ONE line even for a multi-level game (its levels read inline). Hints
 *  ride the whole-day total line, not each game. */
export function roundupShareLine(entry: RoundupEntry): string {
  return `${entry.emoji} ${entry.name} · ${statText(entry)} · ⏱️ ${formatDuration(
    entry.elapsedMs,
  )}`;
}

/** A single-board game's card detail — metric and time (no emoji, no name;
 *  the name sits beside it). Multi-level games use sub-rows instead. */
export function roundupDetail(entry: RoundupEntry): string {
  return `${entry.metric ?? ""} · ${formatDuration(entry.elapsedMs)}`;
}

/** A multi-level game's per-level sub-row detail: the count with the game's
 *  unit, and the time on that level. */
export function roundupLevelDetail(unit: string, level: RoundupLevel): string {
  return `${level.value} ${unit} · ${formatDuration(level.elapsedMs)}`;
}

/** Active play time summed across every game's day. */
export function roundupTotalMs(entries: RoundupEntry[]): number {
  return entries.reduce((ms, e) => ms + e.elapsedMs, 0);
}

/**
 * How many days in a row ending today the player has finished EVERY game.
 * Today is assumed complete (the roundup only exists once it is), then each
 * earlier day is PROBED via `isCompleteOn` and the walk stops at the first
 * that isn't — so it reads only the days the streak actually spans, never
 * the whole history. `isCompleteOn` is injected to keep this pure and
 * testable; the caller wires it to the games' per-date record lookups.
 */
export async function streakEndingToday(
  today: string,
  isCompleteOn: (dateKey: string) => Promise<boolean>,
): Promise<number> {
  let streak = 1; // today, counted unconditionally
  let day = previousDateKey(today);
  // Defensive cap (a decade): a corrupt "always complete" source can't spin.
  for (let i = 0; i < 3650; i++) {
    if (!(await isCompleteOn(day))) break;
    streak += 1;
    day = previousDateKey(day);
  }
  return streak;
}

/** Total hints used across every game's day. */
export function roundupTotalHints(entries: RoundupEntry[]): number {
  return entries.reduce((n, e) => n + e.hints, 0);
}

/** The card's subtitle: the streak (only past day one), the total time,
 *  and the total hints — no emoji, that's the share string's job. */
export function roundupSummary(entries: RoundupEntry[], streak: number): string {
  const hints = roundupTotalHints(entries);
  const parts: string[] = [];
  if (streak > 1) parts.push(`${streak} day streak`);
  parts.push(`Total time ${formatDuration(roundupTotalMs(entries))}`);
  parts.push(`${hints} ${hints === 1 ? "Hint" : "Hints"}`);
  return parts.join(" · ");
}

/**
 * The full multi-game paste: a plain header, a summary line (all-solved,
 * total time, streak), one line per game in the order given, then the
 * canonical link — tight, no blank lines. The date lives in the header so
 * the per-game lines stay short and every line reads as part of one day.
 */
export function buildRoundupText(
  dateKey: string,
  entries: RoundupEntry[],
  streak: number,
): string {
  const total = formatDuration(roundupTotalMs(entries));
  const streakPart = streak > 1 ? ` · 🔥 ${streak}` : "";
  return [
    `WordGirl — ${formatShareDate(dateKey)}`,
    // Whole-day totals: all solved, total time, total hints, then streak.
    `✅ ${entries.length}/${entries.length} · ⏱️ ${total} · ${hintShare(
      roundupTotalHints(entries),
    )}${streakPart}`,
    ...entries.map(roundupShareLine),
    SHARE_URL,
  ].join("\n");
}
