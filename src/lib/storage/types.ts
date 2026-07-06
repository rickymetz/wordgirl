/**
 * Async storage interface. localStorage-backed today; the async signature
 * means swapping in IndexedDB or a synced backend later requires no
 * call-site changes.
 */
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
}

/** Same shape as StorageAdapter; keys are auto-namespaced per game. */
export type GameStore = StorageAdapter;
