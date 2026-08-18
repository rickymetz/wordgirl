/**
 * Namespace moves for games that have been renamed.
 *
 * A game's id is its storage namespace (`wg:v1:local:<id>:`), so renaming
 * one orphans every save, streak and stat behind the old prefix. This
 * moves them across.
 *
 * SYNCHRONOUS, and run before React mounts. Every game hook hydrates once
 * on mount; if it reads the new namespace before the move has happened it
 * finds nothing, decides the day is unplayed, and writes a fresh save over
 * the top. An async migration racing the first render would lose exactly
 * the streaks this exists to protect.
 *
 * NOT gated by a "already done" flag, and idempotent by construction: it
 * looks for the old prefix and returns immediately when there is none.
 * A flag would fire once and never again — which breaks restoring a
 * BACKUP FILE written before the rename, because those files carry the old
 * keys and the restore reloads the page expecting boot to tidy up. Cheap
 * enough to repeat: one key scan per launch.
 */

/** Every id this app has retired, and what it became. */
export const GAME_ID_RENAMES: readonly (readonly [from: string, to: string])[] =
  [["backwords", "pierglass"]];

const PREFIX = "wg:v1:local:";

export function migrateRenamedGames(store: Storage = localStorage): number {
  let moved = 0;
  for (const [from, to] of GAME_ID_RENAMES) {
    const oldNs = `${PREFIX}${from}:`;
    const newNs = `${PREFIX}${to}:`;
    let keys: string[];
    try {
      keys = Object.keys(store).filter((k) => k.startsWith(oldNs));
    } catch {
      // Storage unavailable (Safari private mode). Nothing to do, and
      // nothing worth throwing over during boot.
      return moved;
    }
    for (const oldKey of keys) {
      const newKey = newNs + oldKey.slice(oldNs.length);
      try {
        const value = store.getItem(oldKey);
        // Never clobber the new namespace. If both exist the player has
        // already played under the new id, and that save is the newer
        // truth — drop the stale one rather than overwrite.
        if (value !== null && store.getItem(newKey) === null) {
          store.setItem(newKey, value);
          moved += 1;
        }
        store.removeItem(oldKey);
      } catch {
        // A quota failure mid-move must not take the boot down. The old
        // key is left in place, so the next launch tries again.
      }
    }
  }
  return moved;
}
