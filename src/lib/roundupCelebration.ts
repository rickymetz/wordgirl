import { createGameStore } from "./storage/createGameStore";

/**
 * "roundup" is not a game — just a namespaced corner of storage for the
 * banner's per-day UI flag: has the player dismissed the banner for today.
 * (The confetti keeps no flag: it replays on every hub visit until then.)
 * Keyed by dateKey and never read by any game's archive/streak (that walks
 * each game's own `daily:` prefix).
 *
 * Keyed by the NUMBER of games too: a day's roundup is a different banner
 * once a new game joins (the five-game banner a player dismissed that
 * morning must not swallow the six-game one).
 */
const store = createGameStore("roundup");

const key = (flag: string, dateKey: string, gameCount: number) =>
  `${flag}:${dateKey}:${gameCount}`;

export const loadRoundupDismissed = async (dateKey: string, gameCount: number): Promise<boolean> =>
  (await store.get<boolean>(key("dismissed", dateKey, gameCount))) === true;
export const markRoundupDismissed = (dateKey: string, gameCount: number): Promise<void> =>
  store.set(key("dismissed", dateKey, gameCount), true);
