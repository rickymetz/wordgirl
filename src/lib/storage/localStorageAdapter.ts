import type { StorageAdapter } from "./types";

export function createLocalStorageAdapter(): StorageAdapter {
  return {
    async get<T>(key: string): Promise<T | null> {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        // Corrupted entry — treat as missing rather than crashing the game.
        return null;
      }
    },
    async set<T>(key: string, value: T): Promise<void> {
      localStorage.setItem(key, JSON.stringify(value));
    },
    async remove(key: string): Promise<void> {
      localStorage.removeItem(key);
    },
    async keys(prefix = ""): Promise<string[]> {
      const out: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k !== null && k.startsWith(prefix)) out.push(k);
      }
      return out;
    },
  };
}
