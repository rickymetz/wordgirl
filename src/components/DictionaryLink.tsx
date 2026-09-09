import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

/**
 * Header link from a game to the shared dictionary, for mid-game word
 * lookups. Same chrome as the coach "?" beside it. Leaving the game is
 * safe — progress flushes on hide/unmount — and the browser's back
 * returns to the same screen.
 */
export function DictionaryLink() {
  return (
    <Link
      to="/dictionary"
      aria-label="dictionary"
      className="relative -m-2 flex h-9 w-9 items-center justify-center rounded-full p-2 text-ink-soft active:scale-90 after:absolute after:-inset-1"
    >
      <BookOpen aria-hidden className="h-5 w-5" />
    </Link>
  );
}
