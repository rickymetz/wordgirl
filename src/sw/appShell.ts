/**
 * The app shell must never leave a navigation unanswered.
 *
 * A navigation the service worker cannot satisfy rejects the fetch
 * event, and an installed iOS home-screen app has NO error UI for that
 * — it paints a blank white document (laid out at the default 980px
 * viewport, so it even scrolls). Workbox's precache handler rejects
 * exactly this way: on a precache miss it falls back to a network
 * fetch, and a failed fetch propagates straight out of the handler.
 *
 * A precache miss is not rare on iOS. Safari evicts Cache Storage for
 * home-screen apps, and Workbox does not repair a missing precache
 * entry unless the manifest carries an SRI hash (vite-plugin-pwa does
 * not emit one). Once evicted, every launch depends on a live network
 * fetch landing at exactly the right moment.
 *
 * So every path through the navigation handler ends in a Response: the
 * precached shell, a backup copy of the last shell that worked, or the
 * built-in offline page below.
 */

/** The precached document every navigation resolves to. */
export const SHELL_URL = "/index.html";

/**
 * Backup shell copy, kept OUTSIDE the workbox precache so that
 * cleanupOutdatedCaches() and Safari's precache eviction cannot take
 * the last working shell with them.
 */
export const SHELL_CACHE = "wg-shell-v1";

/**
 * How long a launch waits for the network before it opens from the
 * backup copy instead. A failing fetch rejects; a fetch on a bad
 * mobile connection just never answers, and iOS gives it a minute or
 * more. Either way the screen is blank, so the shell needs a deadline
 * and not only an error path.
 */
export const BACKUP_AFTER_MS = 2000;

/**
 * The deadline when there is no backup to open from. Longer, because a
 * slow real shell still beats the offline page.
 */
export const OFFLINE_AFTER_MS = 10000;

export interface ShellSources {
  /** Workbox's precache handler — may reject, answer non-ok, or stall. */
  fromPrecache: () => Promise<Response | undefined>;
  readBackup: () => Promise<Response | undefined>;
  writeBackup: (response: Response) => Promise<unknown>;
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** Resolves to the response, or to null if it fails or runs out of time. */
function within(
  work: Promise<Response | null>,
  ms: number,
  wait: (ms: number) => Promise<unknown>,
): Promise<Response | null> {
  return Promise.race([work, wait(ms).then(() => null)]);
}

/**
 * Resolve a navigation to a document, always, and inside a bounded
 * time. `keepAlive` receives background work so the service worker can
 * hand it to `event.waitUntil()` instead of making the launch wait on
 * it; `wait` is injectable so tests do not sleep for real.
 */
export async function respondWithShell(
  sources: ShellSources,
  keepAlive: (work: Promise<unknown>) => void = () => {},
  wait: (ms: number) => Promise<unknown> = sleep,
): Promise<Response> {
  // Start the attempt and fold every failure into null — a rejection
  // here is an outcome this function plans for, not a crash, and it
  // must never surface as an unhandled rejection while we wait out the
  // deadline below.
  const fresh: Promise<Response | null> = sources.fromPrecache().then(
    (response) => (response && response.ok ? response : null),
    () => null,
  );

  const quick = await within(fresh, BACKUP_AFTER_MS, wait);
  if (quick) {
    keepAlive(sources.writeBackup(quick.clone()).catch(() => {}));
    return quick;
  }

  // Failed, or too slow to keep an app waiting when a working copy is
  // already on the device.
  const backup = await sources.readBackup().catch(() => undefined);
  if (backup) {
    // Let the fresh one land in its own time and refresh the backup, so
    // the next launch is current.
    keepAlive(
      fresh
        .then((response) => (response ? sources.writeBackup(response) : null))
        .catch(() => {}),
    );
    return backup;
  }

  // Nothing to fall back to: give the network the rest of its deadline.
  // `fresh` may already have settled, in which case this returns at once.
  const last = await within(fresh, OFFLINE_AFTER_MS - BACKUP_AFTER_MS, wait);
  if (last) {
    keepAlive(sources.writeBackup(last.clone()).catch(() => {}));
    return last;
  }

  return offlineShellResponse();
}

/**
 * Last resort: a self-contained document. No external CSS, no script —
 * it has to render when nothing else on the origin is reachable, and a
 * service-worker-synthesized response carries no CSP to satisfy. The
 * link re-navigates, which runs this handler again and picks up the
 * real shell as soon as the network comes back.
 */
export function offlineShellResponse(): Response {
  return new Response(OFFLINE_HTML, {
    // 200, not 503: a failure status lets the browser substitute its
    // own error page, which is the blank screen we are replacing.
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>WordGirl</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    font-family: "Avenir Next", "Avenir", ui-rounded, system-ui, sans-serif;
    background: light-dark(#ffffff, #121116);
    color: light-dark(#26242b, #eceaf0);
  }
  main { max-width: 20rem; text-align: center; }
  h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
  p { margin: 0 0 1.5rem; color: light-dark(#6f6b78, #98939f); }
  a {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 9999px;
    background: light-dark(#171717, #e5e5e5);
    color: light-dark(#ffffff, #121116);
    font-weight: 600;
    text-decoration: none;
  }
</style>
</head>
<body>
<main>
<h1>WordGirl did not load</h1>
<p>The app files are not on this device and the network did not answer. Try again when you have a connection.</p>
<a href="/">Try again</a>
</main>
</body>
</html>
`;
