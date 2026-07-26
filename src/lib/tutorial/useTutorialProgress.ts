import { useRef } from "react";

/**
 * Clamps a tutorial's step index so it only ever moves forward.
 *
 * Steps are derived from live game state, and some of that state is
 * reversible — a player who taps two letters and backspaces them away
 * has "un-done" step one. The instruction should not flap backwards for
 * that, so the high-water mark is what the banner reads.
 *
 * Writing the ref during render is safe here: the update is an
 * idempotent max, so StrictMode's double render lands on the same value.
 */
export function useTutorialProgress(index: number): number {
  const highest = useRef(index);
  if (index > highest.current) highest.current = index;
  return highest.current;
}
