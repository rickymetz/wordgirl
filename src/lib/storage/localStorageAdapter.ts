import type { StorageAdapter } from "./types";

/**
 * Every method has to survive `localStorage` being unavailable, not just
 * unwritable. A browser set to block all storage throws a SecurityError
 * on the PROPERTY ACCESS, before any key is named — so a bare
 * `localStorage.getItem` in a read path is itself a throw site, and the
 * archive and stats pages await these reads with nothing to catch them.
 */
function warn(op: string, err: unknown): void {
  console.warn(`storage ${op} failed`, err);
  window.dispatchEvent(new Event("wg:storage-error"));
}

export function createLocalStorageAdapter(): StorageAdapter {
  return {
    async get<T>(key: string): Promise<T | null> {
      let raw: string | null;
      try {
        raw = localStorage.getItem(key);
      } catch (err) {
        warn("read", err);
        return null;
      }
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        // Corrupted entry — treat as missing rather than crashing the game.
        return null;
      }
    },
    async set<T>(key: string, value: T): Promise<void> {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        // Quota pressure / private-browsing modes: never let a rejected
        // save escape as an unhandled rejection — surface it once so the
        // UI can warn that progress isn't persisting.
        warn("write", err);
      }
    },
    async remove(key: string): Promise<void> {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        warn("remove", err);
      }
    },
    async keys(prefix = ""): Promise<string[]> {
      const out: string[] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k !== null && k.startsWith(prefix)) out.push(k);
        }
      } catch (err) {
        // An empty list is the honest answer for a store we cannot read,
        // and it lets the archive render "nothing played yet" instead of
        // hanging forever on a promise that never settles.
        warn("list", err);
        return [];
      }
      return out;
    },
  };
}
