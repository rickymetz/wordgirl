import { useSyncExternalStore } from "react";

/**
 * Live viewport size for board layout math — re-measures on resize and
 * orientation change.
 *
 * - `vh` is what pages can actually use: innerHeight minus #root's
 *   safe-area padding, which is real (~93px) in installed/PWA mode.
 * - `rem` is the current root font-size: the Text-size setting scales
 *   all the rem-based chrome around a board, so px height budgets must
 *   scale with it or big-text users lose the controls below the fold.
 */

let cached = "0x0x16";

function measure(): string {
  const root = document.getElementById("root");
  const style = root && getComputedStyle(root);
  const insets = style
    ? parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
    : 0;
  const rem =
    parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  cached = `${window.innerWidth}x${window.innerHeight - insets}x${rem}`;
  return cached;
}

function subscribe(onChange: () => void): () => void {
  const handler = () => {
    measure();
    onChange();
  };
  window.addEventListener("resize", handler);
  window.addEventListener("orientationchange", handler);
  measure();
  return () => {
    window.removeEventListener("resize", handler);
    window.removeEventListener("orientationchange", handler);
  };
}

function getSnapshot(): string {
  return cached;
}

export function useViewport(): { vw: number; vh: number; rem: number } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  const [vw, vh, rem] = snapshot.split("x").map(Number);
  return { vw, vh, rem };
}
