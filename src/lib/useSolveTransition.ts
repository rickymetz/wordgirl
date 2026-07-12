import { useEffect, useRef, useState } from "react";

const CONFETTI_MS = 1500;

/**
 * Sequences the confetti → results reveal on a fresh solve.
 * Hydrated-as-solved skips confetti and shows results immediately.
 */
export function useSolveTransition(solved: boolean) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showResults, setShowResults] = useState(() => solved);
  const prevSolved = useRef(solved);

  useEffect(() => {
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
  }, [solved]);

  return { showConfetti, showResults };
}
