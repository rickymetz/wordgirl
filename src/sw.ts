/// <reference lib="webworker" />
/**
 * Service worker (injectManifest). Generated workers give no way to
 * handle a navigation the precache cannot answer in time, and that gap
 * paints an installed iOS app blank — see src/sw/appShell.ts.
 */
import { clientsClaim } from "workbox-core";
import type { PrecacheEntry } from "workbox-precaching";
import {
  addRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precache,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { SHELL_CACHE, SHELL_URL, respondWithShell } from "./sw/appShell";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (PrecacheEntry | string)[];
};

// registerType: "autoUpdate" — a new build takes over without asking,
// and virtual:pwa-register reloads the page on controllerchange.
self.skipWaiting();
clientsClaim();

// precache() + addRoute() rather than precacheAndRoute(), so the
// navigation route can be registered BETWEEN them. Routes match in
// registration order, and the precache route claims "/" on its own
// (directoryIndex: "index.html") — which is the PWA's start_url, the
// one navigation that must not be able to fail.
precache(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const fromPrecache = createHandlerBoundToURL(SHELL_URL);

registerRoute(
  new NavigationRoute(
    (options) =>
      respondWithShell(
        {
          fromPrecache: () => fromPrecache(options),
          readBackup: async () =>
            await (await caches.open(SHELL_CACHE)).match(SHELL_URL),
          writeBackup: async (response) =>
            await (await caches.open(SHELL_CACHE)).put(SHELL_URL, response),
        },
        (work) => options.event.waitUntil(work),
      ),
    {
      // The docs site is proxied at /docs (netlify.toml) — without this
      // the worker would serve the app shell for docs navigations.
      denylist: [/^\/docs/],
    },
  ),
);

// Hashed assets and everything else the manifest covers.
addRoute();
