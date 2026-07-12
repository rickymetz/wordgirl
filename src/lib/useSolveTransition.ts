import { useEffect, useRef, useState } from "react";

const CONFETTI_MS = 1500;

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
