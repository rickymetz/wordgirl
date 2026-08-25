import { formatDuration, formatShareDate } from "./date";
import { SHARE_URL } from "./share";

/**
 * One game's contribution to the day's roundup. The game supplies the
 * pieces; the shared builder decides where the emoji is allowed to go —
 * the SHARE line leads with it, the UI card never shows it (emoji are a
 * share-string-only affordance, see the house rules). Keeping the emoji
 * a field rather than baking it into a string is what lets one function
 * honour that split for every game at once.
 */
export interface RoundupEntry {
  /** The game's share glyph, e.g. "🔻". SHARE line only. */
  emoji: string;
  /** Human game name, e.g. "Polygram". */
  name: string;
  /** The headline stat, no emoji: "42 words", "6 rows · par", "3 boards". */
  metric: string;
  /** Total active play time for the day across all of the game's boards. */
  elapsedMs: number;
}

/** The share glyph + name + stats line a single game paste would carry,
 *  minus the per-game date/URL the roundup owns. */
export function roundupShareLine(entry: RoundupEntry): string {
  return `${entry.emoji} ${entry.name} · ${entry.metric} · ⏱️ ${formatDuration(entry.elapsedMs)}`;
}

/** The stats a game row shows inside the card — no emoji, no name (the
 *  name sits beside it in its own element). */
export function roundupDetail(entry: RoundupEntry): string {
  return `${entry.metric} · ${formatDuration(entry.elapsedMs)}`;
}

/**
 * The full multi-game paste: a plain header, one line per game in the
 * order given, then the canonical link — tight, no blank lines, the same
 * shape a single game's share takes but stacked. The date lives here so
 * the per-game lines stay short and every line reads as part of one day.
 */
export function buildRoundupText(dateKey: string, entries: RoundupEntry[]): string {
  return [
    `WordGirl — ${formatShareDate(dateKey)}`,
    ...entries.map(roundupShareLine),
    SHARE_URL,
  ].join("\n");
}
