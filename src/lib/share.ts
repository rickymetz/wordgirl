import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Canonical link for share strings — hardcoded so results shared from
 * deploy previews or localhost still point friends at the real site.
 * Bare domain (no scheme) reads clean and every messenger linkifies it.
 */
export const SHARE_URL = "wordgirl.net";

/**
 * The one share flow every results card uses: the native share sheet
 * where it exists (dismissing it is a "changed my mind", not an
 * error), otherwise copy to the clipboard and flash `copied` for a
 * moment. Most cards want components/ShareButton, which wraps this.
 */
export function useShare(text: string): {
  /** Resolves true only if the result actually left — see below. */
  share: () => Promise<boolean>;
  copied: boolean;
  failed: boolean;
} {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  /**
   * Returns whether the result actually went anywhere. Both failure modes
   * here are silent to the caller otherwise: dismissing the native sheet
   * is a "changed my mind" that this deliberately swallows, and the
   * clipboard path can refuse outright. A caller that counts shares must
   * be able to tell those apart from a share that happened, or it counts
   * the tap instead of the share.
   */
  const share = useCallback(async (): Promise<boolean> => {
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return true;
      } catch {
        // Dismissing the share sheet is a "changed my mind".
        return false;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
      return true;
    } catch {
      setFailed(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setFailed(false), 2000);
      return false;
    }
  }, [text]);

  return { share, copied, failed };
}
