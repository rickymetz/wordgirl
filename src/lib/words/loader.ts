import dictUrl from "./dictionary.txt?url";
import { parseDictionary, type Dictionary } from "./dictionary";

let dictPromise: Promise<Dictionary> | null = null;

/**
 * The dictionary ships as a static asset (precached by the service
 * worker) rather than inlined into the game's JS chunk — fetching and
 * parsing it lazily keeps ~170 KB of text out of the bundle and off the
 * main thread at import time. The promise is a module-level singleton
 * so React's `use()` can suspend on a stable reference.
 */
export function loadDictionary(): Promise<Dictionary> {
  dictPromise ??= fetch(dictUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`dictionary fetch failed: ${res.status}`);
      return res.text();
    })
    .then(parseDictionary)
    .catch((err: unknown) => {
      // Don't cache the failure — the next render retries the fetch.
      dictPromise = null;
      throw err;
    });
  return dictPromise;
}
