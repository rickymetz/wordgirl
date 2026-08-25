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
export interface RoundupEntry {
  /** The game's share glyph, e.g. "🔻". SHARE line only. */
  emoji: string;
  /** Human game name, e.g. "Polygram". */
  name: string;
  /** The headline stat, no emoji: "42 words", "6 rows", "12 pieces". */
  metric: string;
  /** Total active play time for the day across all of the game's boards. */
  elapsedMs: number;
  /** Hints used across the day's boards — 0 is a clean solve worth saying. */
  hints: number;
}

/** The hint tail every game's own share string uses: the count behind a
 *  peeking face, or the "no help" glyph at zero. SHARE strings only. */
function hintShare(hints: number): string {
  return hints > 0 ? `🫣 ${hints}` : "🤓 0";
}

/** The same fact in plain words for the card — no emoji, singular/plural
 *  correct, and "no hints" said out loud because a clean solve is a brag. */
function hintWords(hints: number): string {
  if (hints <= 0) return "no hints";
  return `${hints} hint${hints === 1 ? "" : "s"}`;
}

/** The share glyph + name + stats line a single game paste would carry,
 *  minus the per-game date/URL the roundup owns. */
export function roundupShareLine(entry: RoundupEntry): string {
  return `${entry.emoji} ${entry.name} · ${entry.metric} · ⏱️ ${formatDuration(
    entry.elapsedMs,
  )} · ${hintShare(entry.hints)}`;
}

/** The stats a game row shows inside the card — no emoji, no name (the
 *  name sits beside it in its own element). */
export function roundupDetail(entry: RoundupEntry): string {
  return `${entry.metric} · ${formatDuration(entry.elapsedMs)} · ${hintWords(
    entry.hints,
  )}`;
}

/** Active play time summed across every game's day. */
export function roundupTotalMs(entries: RoundupEntry[]): number {
  return entries.reduce((ms, e) => ms + e.elapsedMs, 0);
}

/**
 * How many days in a row ending today the player has finished EVERY game,
 * counting back through a set of all-games-complete dates. Today itself is
 * assumed complete by the caller (the roundup only exists once it is), so
 * a lone perfect day is a streak of 1; the count stops at the first gap.
 */
export function consecutiveDaysEndingToday(
  today: string,
  completeDates: ReadonlySet<string>,
): number {
  let streak = 0;
  let day = today;
  // Today counts even if the persisted set hasn't caught up with this
  // session's final save yet — the caller only asks once the day is done.
  while (day === today || completeDates.has(day)) {
    streak += 1;
    day = previousDateKey(day);
  }
  return streak;
}

/** The card's one-line summary and the share's second line both say the
 *  same thing; this is the shared phrasing minus any emoji. */
export function roundupSummary(entries: RoundupEntry[], streak: number): string {
  const parts = [
    `${entries.length}/${entries.length} solved`,
    formatDuration(roundupTotalMs(entries)),
  ];
  if (streak > 1) parts.push(`${streak}-day streak`);
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
    `✅ ${entries.length}/${entries.length} · ⏱️ ${total}${streakPart}`,
    ...entries.map(roundupShareLine),
    SHARE_URL,
  ].join("\n");
}
