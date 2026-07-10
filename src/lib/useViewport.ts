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
export function useViewport(): { vw: number; vh: number; rem: number } {
  const snapshot = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("resize", onChange);
      window.addEventListener("orientationchange", onChange);
      return () => {
        window.removeEventListener("resize", onChange);
        window.removeEventListener("orientationchange", onChange);
      };
    },
    () => {
      const root = document.getElementById("root");
      const style = root && getComputedStyle(root);
      const insets = style
        ? parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
        : 0;
      const rem =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      return `${window.innerWidth}x${window.innerHeight - insets}x${rem}`;
    },
  );
  const [vw, vh, rem] = snapshot.split("x").map(Number);
  return { vw, vh, rem };
}
