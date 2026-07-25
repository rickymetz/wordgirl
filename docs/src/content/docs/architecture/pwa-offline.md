---
title: PWA and offline operation
description: The service worker keeps the application available without a connection.
---

You can install WordGirl. You can play without a connection. The device makes the puzzles. Refer to [How daily puzzles work](/docs/games/daily-puzzles/). Thus offline operation only needs the application files and the dictionary in the cache.

## The service worker

The file `vite.config.ts` configures the vite-plugin-pwa module. The mode is `autoUpdate`. The strategy is `injectManifest`: the worker is `src/sw.ts`, and the application controls the routes.

- Workbox puts these file types in the cache: js, css, html, txt, svg, png, and woff2. The txt type is important. It puts `dictionary.txt` in the cache. Thus the word check operates without a connection.
- Navigation requests get `/index.html`.
- The path `/docs` is not included. The documentation is at wordgirl.net/docs through a proxy in `netlify.toml`. The service worker must not catch these requests.
- The manifest sets the standalone display mode and the icons.

## The shell always gives an answer

A navigation that the service worker cannot answer makes the fetch event fail. An installed application on iOS has no error page for this condition. It shows an empty white document. Thus the worker must always give a document.

The file `src/sw/appShell.ts` has three steps. The worker does the steps in this sequence:

1. Read `/index.html` from the Workbox cache. If the cache does not have it, Workbox gets it from the network.
2. If step 1 fails or takes more than 2 seconds, read the backup copy from the `wg-shell-v1` cache. The worker writes this copy after each good navigation. The copy is not in the Workbox cache, thus `cleanupOutdatedCaches()` and the browser cannot remove it with the other files. The worker lets the slow file from step 1 arrive later. Then it writes the backup copy again, and the subsequent start is current.
3. If step 2 finds no copy, wait for the network for 10 seconds in total. Then give the offline page. This page is in the worker. It has no external css, script, or font. Thus it shows when no other file on the site is available.

The time limit is as important as the error path. A bad connection does not give an error to the worker. It gives no answer, and iOS permits one minute or more. The screen is empty for all of that time. Thus the shell must have a limit and must not only wait.

The sequence of the routes is important. The Workbox precache route holds `/` (the `directoryIndex` option), and `/` is the `start_url` of the application. Thus `src/sw.ts` uses `precache()`, then adds the navigation route, then calls `addRoute()`. The navigation route must be first.

Safari removes the cache storage of an installed application after a time. Workbox does not write a missing file to the precache again. Thus the steps above are not rare conditions on iOS: they are the usual repair path.

## The boot fallback

The file `index.html` has a message in `#root`. React removes this message when it mounts. Thus the message stays only if the application does not start — for example, when a code file gives a 404 after a new deployment.

The message is not visible for the first 8 seconds. A css animation with a delay does this. There is no javascript, because the javascript is the part that failed. If the css also did not arrive, the message shows immediately without style, which is correct for that condition.

## Updates

- The file `src/main.tsx` keeps the service worker registration. It looks for updates each hour. It also looks for updates when the application comes to the front.
- A new worker becomes active without a question to the user. The next navigation shows the new version. Saved progress survives the update: each game stores a `puzzleKey` fingerprint in its saves, so a deployment that bumps `DICT_VERSION` for one game does not invalidate another game's saves when the actual puzzle has not changed.
- The settings dialog has a manual update row. The function `checkForUpdates()` in `src/lib/swUpdate.ts` does the check. The possible results are "updating", "current", "failed", and "unavailable".
- After a deployment, an old chunk address can be incorrect. The `RouteError` component loads the page again one time.

## Cache headers

The file `netlify.toml` sets the cache times. The files in `/assets/` have names with a hash. Their cache time is one year. The files `index.html` and `sw.js` use `no-cache`: the browser can keep them, but it must revalidate them on each request. Thus the worker sees each new deployment quickly.

## Storage protection

The `StoragePrompt` component asks the browser for persistent storage. Then the browser does not remove the saved games when storage is low. Most browsers give this permission without a question. Firefox shows a question to the user. Thus the component shows a dialog first on Firefox.

## iOS

On iOS, use Share and then "Add to Home Screen" to install the application. The application has no page scroll. Refer to [Layout, motion, and text](/docs/design/layout-motion/). The root element contains the safe area as inner padding.
