/**
 * Deterministic fingerprint of a puzzle's identity — if two builds
 * produce the same puzzleKey for a date, the puzzle hasn't changed
 * and saved progress is still valid, even if DICT_VERSION has bumped
 * for an unrelated game.
 *
 * Not cryptographic — just a fast, collision-resistant hash of the
 * serialized puzzle data each game considers definitional.
 */
export function puzzleKey(data: unknown): string {
  const s = JSON.stringify(data);
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
