---
title: PWA & offline
description: Service worker, precache, and the update flow that keeps the app fresh without interrupting play.
---

WordGirl is installable and fully playable offline — puzzles are generated
on-device ([no server](/games/daily-puzzles/)), so offline support is mostly
about caching the app shell and the dictionary.

## Service worker

Configured in `vite.config.ts` via **vite-plugin-pwa** with
`registerType: "autoUpdate"`:

- Workbox precaches `js`, `css`, `html`, `txt`, `svg`, `png`, `woff2` —
  the `.txt` glob is load-bearing: it precaches `dictionary.txt`, so word
  validation works offline.
- `navigateFallback: /index.html` for SPA routing.
- Manifest: standalone display, theme `#6d28d9`, 192/512/maskable icons.

## The update flow

- `src/main.tsx` captures the SW registration and checks for updates hourly
  and whenever the app returns to the foreground.
- With `autoUpdate`, a new worker activates and the next navigation gets the
  new build — there's no blocking "update available" prompt mid-game.
- Settings has a manual "Check for updates" row backed by
  `checkForUpdates()` in `src/lib/swUpdate.ts`, which reports
  `"updating" | "current" | "failed" | "unavailable"`. The button only
  *triggers a check*; activation is still the autoUpdate machinery.
- The deploy edge case — a lazy chunk 404ing because the deployed hashes
  changed under a running session — is handled by `RouteError`, which
  detects stale-chunk errors and reloads once.

## Caching headers

`netlify.toml` gives `/assets/*` an immutable 1-year cache (hashed
filenames) while `index.html` and `sw.js` are `no-cache`, so the worker
always sees new deploys promptly.

## Storage durability

`StoragePrompt` (rendered in every game layout) requests
`navigator.storage.persist()` so the browser won't evict saves under
storage pressure. It's silent where browsers grant it automatically;
Firefox shows a real prompt, so there it's wrapped in an explanatory dialog
(and waits until no other modal is open).

## iOS notes

iOS installs via Share → Add to Home Screen. The app avoids page scrolling
entirely (see [Layout rules](/design/layout-motion/)) partly because of
iOS rubber-banding; `#root` handles safe-area insets as inside padding.
