import { useEffect, useRef, useState } from "react";
import { CONFETTI_DURATION } from "../components/ConfettiOverlay";

/** Hold the reveal until the burst has actually finished. Read from the
 *  overlay rather than restated, so retuning the burst can't leave all
 *  five games cutting their confetti off mid-flight. */
const CONFETTI_MS = CONFETTI_DURATION.burst + 100;

/**
 * Sequences the confetti → results reveal on a fresh solve.
 * When `hydratedAsSolved` is true, confetti is skipped and results
 * show immediately (e.g. returning to an already-solved puzzle or
 * switching difficulty tabs).
 */
export function useSolveTransition(solved: boolean, hydratedAsSolved = false) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showResults, setShowResults] = useState(() => solved || hydratedAsSolved);
  const prevSolved = useRef(solved || hydratedAsSolved);
  const wasHydrated = useRef(hydratedAsSolved);

  useEffect(() => {
    if (hydratedAsSolved && !wasHydrated.current) {
      wasHydrated.current = true;
      prevSolved.current = true;
      setShowResults(true);
      return;
    }
    if (solved && !prevSolved.current) {
      setShowConfetti(true);
      setShowResults(false);
      const t = setTimeout(() => {
        setShowConfetti(false);
        setShowResults(true);
      }, CONFETTI_MS);
      prevSolved.current = true;
      return () => clearTimeout(t);
    }
    prevSolved.current = solved;
  }, [solved, hydratedAsSolved]);

  return { showConfetti, showResults };
}
