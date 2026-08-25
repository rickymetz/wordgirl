/** "2026-07-06" in the user's local timezone — the daily puzzle key. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * The date key one day before the given key (for streak math).
 * Arithmetic happens at NOON: in timezones whose DST transition falls at
 * midnight (Chile, Cuba), a constructed local midnight can resolve into
 * the neighboring day and skew or even loop the date walk.
 */
export function previousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return localDateKey(new Date(y, m - 1, d - 1, 12));
}

/** All date keys from `fromKey` to `toKey` inclusive, ascending. */
export function dateKeyRange(fromKey: string, toKey: string): string[] {
  const out: string[] = [];
  let key = fromKey;
  while (key <= toKey) {
    out.push(key);
    const [y, m, d] = key.split("-").map(Number);
    key = localDateKey(new Date(y, m - 1, d + 1, 12));
  }
  return out;
}

/** "Sunday, July 5" for archive listings. */
export function formatDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * The hub card's date, longest first: `GameStatus` measures its column and
 * renders the first rung that fits on ONE line. The Text-size and Font
 * settings both change how wide a name renders, so a single format can't
 * hold at every setting — the ladder steps the weekday and month names down
 * and, at the last rung, drops the weekday entirely so something always
 * fits. Rung 0 is exactly `formatDateKey`.
 */
export function dateKeyFormats(dateKey: string): string[] {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const rungs: Intl.DateTimeFormatOptions[] = [
    { weekday: "long", month: "long" },
    { weekday: "long", month: "short" },
    { weekday: "short", month: "short" },
    { month: "short" },
  ];
  return rungs.map((rung) =>
    date.toLocaleDateString(undefined, { ...rung, day: "numeric" }),
  );
}

/** "July 10" — the share-string date every game's result header uses. */
export function formatShareDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
}

/** "12:34" (or "1:02:03") for solve times. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}
