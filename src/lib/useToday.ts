import { useSyncExternalStore } from "react";
import { localDateKey } from "./date";

/**
 * The local date key as live state: re-checks every minute and whenever
 * the app returns to the foreground, so date-keyed UI (hub status
 * cards) rolls over at midnight and on PWA resume instead of showing
 * yesterday until a full reload.
 */
export function useToday(): string {
  return useSyncExternalStore(
    (onChange) => {
      const timer = setInterval(onChange, 60_000);
      document.addEventListener("visibilitychange", onChange);
      return () => {
        clearInterval(timer);
        document.removeEventListener("visibilitychange", onChange);
      };
    },
    () => localDateKey(),
  );
}
