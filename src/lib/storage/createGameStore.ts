import type { GameStore, StorageAdapter } from "./types";
import { createLocalStorageAdapter } from "./localStorageAdapter";

/**
 * profileId is the auth seam: "local" today. When auth arrives, swap the
 * adapter for a syncing one and map "local" onto the signed-in user's id —
 * game code never changes because all reads/writes go through GameStore.
 */
const PROFILE_ID = "local";

const defaultAdapter = createLocalStorageAdapter();

export function createGameStore(
  gameId: string,
  adapter: StorageAdapter = defaultAdapter,
): GameStore {
  const ns = `wg:v1:${PROFILE_ID}:${gameId}:`;
  return {
    get: (key) => adapter.get(ns + key),
    set: (key, value) => adapter.set(ns + key, value),
    remove: (key) => adapter.remove(ns + key),
    keys: async (prefix = "") =>
      (await adapter.keys(ns + prefix)).map((k) => k.slice(ns.length)),
  };
}
