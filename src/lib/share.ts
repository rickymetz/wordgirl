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
  share: () => void;
  copied: boolean;
  failed: boolean;
} {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const share = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // Dismissing the share sheet is a "changed my mind".
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setFailed(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setFailed(false), 2000);
    }
  }, [text]);

  return { share, copied, failed };
}
