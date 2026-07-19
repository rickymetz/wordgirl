---
title: PWA and offline operation
description: The service worker keeps the application available without a connection.
---

You can install WordGirl. You can play without a connection. The device makes the puzzles. Refer to [How daily puzzles work](/docs/games/daily-puzzles/). Thus offline operation only needs the application files and the dictionary in the cache.

## The service worker

The file `vite.config.ts` configures the vite-plugin-pwa module. The mode is `autoUpdate`.

- Workbox puts these file types in the cache: js, css, html, txt, svg, png, and woff2. The txt type is important. It puts `dictionary.txt` in the cache. Thus the word check operates without a connection.
- Navigation requests get `/index.html`.
- The path `/docs` is not included. The documentation is at wordgirl.net/docs through a proxy in `netlify.toml`. The service worker must not catch these requests.
- The manifest sets the standalone display mode and the icons.

## Updates

- The file `src/main.tsx` keeps the service worker registration. It looks for updates each hour. It also looks for updates when the application comes to the front.
- A new worker becomes active without a question to the user. The next navigation shows the new version.
- The settings dialog has a manual update row. The function `checkForUpdates()` in `src/lib/swUpdate.ts` does the check. The possible results are "updating", "current", "failed", and "unavailable".
- After a deployment, an old chunk address can be incorrect. The `RouteError` component loads the page again one time.

## Cache headers

The file `netlify.toml` sets the cache times. The files in `/assets/` have names with a hash. Their cache time is one year. The files `index.html` and `sw.js` have no cache. Thus the worker sees each new deployment quickly.

## Storage protection

The `StoragePrompt` component asks the browser for persistent storage. Then the browser does not remove the saved games when storage is low. Most browsers give this permission without a question. Firefox shows a question to the user. Thus the component shows a dialog first on Firefox.

## iOS

On iOS, use Share and then "Add to Home Screen" to install the application. The application has no page scroll. Refer to [Layout, motion, and text](/docs/design/layout-motion/). The root element contains the safe area as inner padding.
