import { createGameStore } from "./storage/createGameStore";

/**
 * "roundup" is not a game — just a namespaced corner of storage for the
 * banner's per-day UI flags: has the confetti already played today (so it
 * fires ONCE, not on every hub visit), and has the player dismissed the
 * banner for today. Both are keyed by dateKey and never read by any game's
 * archive/streak (that walks each game's own `daily:` prefix).
 *
 * Keyed by the NUMBER of games too: a day's roundup is a different banner
 * once a new game joins (the five-game banner a player dismissed or
 * celebrated that morning must not swallow the six-game one).
 */
const store = createGameStore("roundup");

const key = (flag: string, dateKey: string, gameCount: number) =>
  `${flag}:${dateKey}:${gameCount}`;

export const loadRoundupCelebrated = async (dateKey: string, gameCount: number): Promise<boolean> =>
  (await store.get<boolean>(key("celebrated", dateKey, gameCount))) === true;
export const markRoundupCelebrated = (dateKey: string, gameCount: number): Promise<void> =>
  store.set(key("celebrated", dateKey, gameCount), true);

export const loadRoundupDismissed = async (dateKey: string, gameCount: number): Promise<boolean> =>
  (await store.get<boolean>(key("dismissed", dateKey, gameCount))) === true;
export const markRoundupDismissed = (dateKey: string, gameCount: number): Promise<void> =>
  store.set(key("dismissed", dateKey, gameCount), true);
