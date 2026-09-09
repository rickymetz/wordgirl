import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { trackDictionary } from "../lib/analytics";

/**
 * Header link from a game to the shared dictionary, for mid-game word
 * lookups. Same chrome as the coach "?" beside it, EXCEPT the negative
 * margin is vertical-only plus an explicit right margin: the coach
 * button's own -m-2 collapses the header's gap-2, and two adjacent
 * icon buttons that both collapse it end up with hit areas 28px apart
 * — the "?" then click-steals the book's right third (caught by
 * scripts/audit-touch-targets.mjs). mr-2 restores a 44px
 * centre-to-centre distance.
 *
 * Render it in DAILY and ARCHIVE modes only. Those flush progress on
 * hide/unmount, so leaving is safe and browser back returns to the
 * same board. Practice mints a fresh random seed per mount (back
 * lands on a DIFFERENT empty board) and the tutorial script restarts
 * — a one-tap exit that silently discards a run is worse than the
 * lookup is worth.
 */
export function DictionaryLink({ gameId }: { gameId: string }) {
  return (
    <Link
      to="/dictionary"
      aria-label="dictionary"
      onClick={() => trackDictionary(gameId)}
      className="relative -my-2 mr-2 flex h-9 w-9 items-center justify-center rounded-full p-2 text-ink-soft active:scale-90 after:absolute after:-inset-1"
    >
      <BookOpen aria-hidden className="h-5 w-5" />
    </Link>
  );
}
