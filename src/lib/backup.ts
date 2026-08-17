import { createLocalStorageAdapter } from "./storage/localStorageAdapter";
import type { StorageAdapter } from "./storage/types";
import { localDateKey } from "./date";

/**
 * Export and restore a player's progress as a JSON file.
 *
 * This exists because progress is device-local by design — no accounts,
 * no server — which is the privacy story AND the one real risk: iOS
 * evicts localStorage for PWAs left unused for weeks, and a cleared
 * browser takes every streak with it. A file the player holds is the
 * backup that costs no server and no sign-up.
 *
 * EVERYTHING lives under one prefix. Settings, dictionary bookmarks and
 * all five games' saves are namespaced `wg:v1:local:`, so a backup is
 * simply that prefix's contents — no per-game registry to keep in sync,
 * and a game added tomorrow is included without touching this file.
 */

/** The one namespace every persisted value already shares. */
export const BACKUP_PREFIX = "wg:v1:local:";

/**
 * Bumped only if the FILE shape changes — not when a game changes its
 * saves. Individual day saves carry their own `dictVersion`/`puzzleKey`
 * and are validated by the game on load, so a restored save from an old
 * build is rejected by the same guards that reject a stale local one.
 */
export const BACKUP_FORMAT = 1;

/** Identifies the file as ours before we write anything from it. */
const BACKUP_APP = "wordgirl";

export interface Backup {
  app: typeof BACKUP_APP;
  format: number;
  /** ISO timestamp, for display only — never used to order or merge. */
  exportedAt: string;
  /** Raw storage entries, keyed by their full namespaced key. */
  data: Record<string, unknown>;
}

const defaultAdapter = createLocalStorageAdapter();

/**
 * Read every namespaced value into a backup object.
 *
 * A key whose value fails to parse comes back null from the adapter and
 * is skipped rather than exported as null: a corrupt entry is already
 * invisible to the game, and writing it into the backup would preserve
 * the corruption across a restore.
 */
export async function createBackup(
  adapter: StorageAdapter = defaultAdapter,
  now: Date = new Date(),
): Promise<Backup> {
  const keys = await adapter.keys(BACKUP_PREFIX);
  const data: Record<string, unknown> = {};
  for (const key of keys) {
    const value = await adapter.get(key);
    if (value !== null) data[key] = value;
  }
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: now.toISOString(),
    data,
  };
}

/** `wordgirl-backup-2026-08-17.json` — sorts chronologically in a folder. */
export function backupFilename(now: Date = new Date()): string {
  return `wordgirl-backup-${localDateKey(now)}.json`;
}

export type ParseResult =
  | { ok: true; backup: Backup }
  | { ok: false; error: string };

/**
 * Validate a file the player picked before it is allowed near storage.
 *
 * The prefix check is the load-bearing one. Import writes whatever keys
 * the file names, so without it a hand-edited or hostile file could set
 * arbitrary localStorage entries on this origin — including keys the
 * docs site (proxied into this origin at /docs) can read. Every key must
 * sit under our namespace, and a file containing even one that does not
 * is rejected whole rather than partially applied.
 */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "That file isn't a WordGirl backup." };
  }
  const candidate = raw as Partial<Backup>;
  if (candidate.app !== BACKUP_APP) {
    return { ok: false, error: "That file isn't a WordGirl backup." };
  }
  if (typeof candidate.format !== "number") {
    return { ok: false, error: "That backup is missing its format version." };
  }
  if (candidate.format > BACKUP_FORMAT) {
    return {
      ok: false,
      error: "That backup was made by a newer version of WordGirl.",
    };
  }
  const data = candidate.data;
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, error: "That backup has no progress in it." };
  }
  const foreign = Object.keys(data).filter((k) => !k.startsWith(BACKUP_PREFIX));
  if (foreign.length > 0) {
    return {
      ok: false,
      error: "That backup contains entries that aren't WordGirl's.",
    };
  }
  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      format: candidate.format,
      exportedAt:
        typeof candidate.exportedAt === "string" ? candidate.exportedAt : "",
      data: data as Record<string, unknown>,
    },
  };
}

/**
 * What the confirmation dialog puts in front of the player.
 *
 * Counts DAY SAVES rather than keys, because "148 entries" means nothing
 * and "148 days" is the thing they are about to overwrite. Games are
 * counted from the key segment after the profile id.
 */
export function summarizeBackup(backup: Backup): {
  days: number;
  games: number;
  exportedAt: string;
} {
  const keys = Object.keys(backup.data);
  const games = new Set<string>();
  let days = 0;
  for (const key of keys) {
    const rest = key.slice(BACKUP_PREFIX.length);
    const [game, ...tail] = rest.split(":");
    const leaf = tail.join(":");
    // Non-game namespaces share the prefix: settings has no leaf, and
    // dictionary holds bookmarks. Neither is a game.
    if (game && leaf && game !== "dictionary") games.add(game);
    if (leaf.startsWith("daily:")) days += 1;
  }
  return { days, games: games.size, exportedAt: backup.exportedAt };
}

/**
 * Replace all local progress with the backup's.
 *
 * A REPLACE, not a merge. Merging two histories of the same day has no
 * right answer — pick the higher score and you reward keeping a stale
 * device around; pick the newer and a restore can silently lose a day
 * the player just finished. Replace is the only rule that is honest
 * about what it does, which is why the confirmation says so plainly.
 *
 * Existing keys are cleared first so a restore cannot leave days behind
 * that the backup does not contain.
 */
export async function restoreBackup(
  backup: Backup,
  adapter: StorageAdapter = defaultAdapter,
): Promise<void> {
  const existing = await adapter.keys(BACKUP_PREFIX);
  for (const key of existing) await adapter.remove(key);
  for (const [key, value] of Object.entries(backup.data)) {
    await adapter.set(key, value);
  }
}
