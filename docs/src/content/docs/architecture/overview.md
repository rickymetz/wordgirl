---
title: Architecture overview
description: One Vite application contains five games. This page shows the structure.
---

WordGirl is one application. It uses React 19, TypeScript, and Vite. Each game is one folder. A registry connects the games to the routes. The game engines are pure TypeScript. They do not use React or the DOM.

## The parts

- React 19, react-router-dom 7, TypeScript 5.8
- Vite 6 with Tailwind CSS v4. The design tokens are in CSS. There is no Tailwind configuration file.
- The motion library for animation. The lucide-react library for icons.
- The vite-plugin-pwa module for offline operation.
- Vitest 3 for tests. The playwright-core module for UI checks.
- Netlify serves the application from the `main` branch. The file `netlify.toml` contains the headers and redirects.

## The registry

The file `src/games/registry.ts` is the list of games. Each item is a `GameDefinition`. It contains the id, the name, the tagline, the accent key, the page component, and the extra routes. The extra routes are practice, archive, stats, and archive replay. The router makes the routes from this list. To add a game to the router, you add one item to the registry.

Each game is one separate code chunk. The hub does not load game code. The game code loads when you open the game. After a new deployment, an old chunk address can be incorrect. The `RouteError` component finds this condition. It loads the page again one time.

## One game folder

```
src/games/<id>/
  index.ts    GameDefinition
  engine/     pure TypeScript: make, examine, and count
  state/      React hooks and reducers
  ui/         components
```

The division is strict. An engine is a function of the dictionary and the seed. Refer to [How daily puzzles work](/docs/games/daily-puzzles/). Thus the tests can operate in Node, and each device makes the same puzzle.

## The start sequence

1. The file `src/main.tsx` applies the theme and the text size before the first paint. Then it registers the service worker. Then it shows `App`.
2. The file `src/App.tsx` puts the router in `<MotionConfig reducedMotion="user">`.
3. The routes are `/` for the hub, `/dictionary`, and `/games/<id>` for each game. All other addresses go to the hub.

## The shared code

- `src/components/` contains the [game kit components](/docs/kit/components/).
- `src/lib/` contains the [hooks and utilities](/docs/kit/utilities/), the [data storage](/docs/architecture/persistence/), and the [dictionary](/docs/architecture/dictionary/).
- `src/hub/` contains the hub page and the game cards.
