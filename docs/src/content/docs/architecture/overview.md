---
title: Architecture overview
description: One Vite app, five games, a registry, and pure-TypeScript engines.
---

WordGirl is a single Vite + React 19 + TypeScript app. Each game is a folder;
a registry turns folders into routes; engines are pure TypeScript with no
React or DOM in them.

## Tech stack

- **React 19**, **react-router-dom 7**, **TypeScript 5.8**
- **Vite 6** with **Tailwind CSS v4** (`@tailwindcss/vite` — tokens live in
  CSS, there is no `tailwind.config`)
- **motion** (Framer Motion 12) for animation, **lucide-react** for icons
- **vite-plugin-pwa** for offline support
- **Vitest 3** (node + jsdom projects), **playwright-core** for UI checks
- Deployed to Netlify from `main`; hardened headers and SPA redirects in
  `netlify.toml`

## The registry pattern

`src/games/registry.ts` is the single list of games. Each entry is a
`GameDefinition`: id, name, tagline, `accentLevel` (its palette key), a lazy
`Page` component, and `extraRoutes` (practice, archive, stats, archive
replay). `src/router.tsx` generates `/games/<id>` routes from the registry —
adding a game to the router means adding one registry entry.

Every game route is wrapped in a `GameLayout` providing storage prompts, and
each game is its own lazy chunk — the hub loads nothing game-specific until
you tap a card. A shared `RouteError` boundary catches the classic
lazy-chunk failure after a fresh deploy and auto-reloads once
(sessionStorage-guarded).

## Inside a game folder

```
src/games/<id>/
  index.ts    GameDefinition
  engine/     pure TS: generation, validation, scoring — no React, no DOM
  state/      React hooks and reducers wiring engine to UI
  ui/         components
```

The engine/state/ui split is strict. Engines are deterministic functions of
`(dictionary, seed)` — see [How daily puzzles work](/docs/games/daily-puzzles/) —
which is what makes them unit-testable in plain Node and safe to run
identically on every device.

## App entry flow

1. `src/main.tsx` applies saved theme and text-size settings before first
   paint, registers the service worker (with hourly and on-foreground update
   checks), and renders `App`.
2. `src/App.tsx` wraps the router in `<MotionConfig reducedMotion="user">`.
3. Routes: `/` (hub), `/dictionary` (lazy), `/games/<id>` (+ per-game extra
   routes), `*` → home.

## Where the shared code lives

- `src/components/` (+ `src/components/game/`) — the [Game Kit
  components](/docs/kit/components/)
- `src/lib/` — [hooks and utilities](/docs/kit/utilities/): storage,
  [daily persistence](/docs/architecture/persistence/), the
  [dictionary](/docs/architecture/dictionary/), date/random/share/viewport
  helpers
- `src/hub/` — the hub page and its game cards
