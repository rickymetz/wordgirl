import { useShare } from "../lib/share";

/**
 * The house share button: accent pill, native sheet or copy fallback,
 * "Copied!" flash. Every results card renders this one component so a
 * share fix lands in every game at once.
 */
export function ShareButton({ text }: { text: string }) {
  const { share, copied } = useShare(text);
  return (
    <button
      type="button"
      onClick={share}
      className="rounded-full bg-accent py-3 font-semibold text-surface active:scale-95"
    >
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
