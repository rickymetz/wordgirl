import { useShare } from "../lib/share";
import { trackShare } from "../lib/analytics";

/**
 * The house share button: accent pill, native sheet or copy fallback,
 * "Copied!" flash. Every results card renders this one component so a
 * share fix lands in every game at once.
 */
export function ShareButton({ text, gameId }: { text: string; gameId?: string }) {
  const { share, copied, failed } = useShare(text);
  return (
    <button
      type="button"
      onClick={() => { share(); if (gameId) trackShare(gameId); }}
      className="rounded-full bg-accent px-6 py-3 font-semibold text-surface active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white/50"
    >
      {copied ? "Copied!" : failed ? "Can't copy" : "Share"}
    </button>
  );
}
