import { createGameStore } from "./storage/createGameStore";

/**
 * "roundup" is not a game — just a namespaced corner of storage for the
 * banner's per-day UI flags: has the confetti already played today (so it
 * fires ONCE, not on every hub visit), and has the player dismissed the
 * banner for today. Both are keyed by dateKey and never read by any game's
 * archive/streak (that walks each game's own `daily:` prefix).
 */
const store = createGameStore("roundup");

export const loadRoundupCelebrated = async (dateKey: string): Promise<boolean> =>
  (await store.get<boolean>(`celebrated:${dateKey}`)) === true;
export const markRoundupCelebrated = (dateKey: string): Promise<void> =>
  store.set(`celebrated:${dateKey}`, true);

export const loadRoundupDismissed = async (dateKey: string): Promise<boolean> =>
  (await store.get<boolean>(`dismissed:${dateKey}`)) === true;
export const markRoundupDismissed = (dateKey: string): Promise<void> =>
  store.set(`dismissed:${dateKey}`, true);
