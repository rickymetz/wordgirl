import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { HubPage } from "./hub/HubPage";
import { RouteError } from "./components/RouteError";
import { StoragePrompt } from "./components/StoragePrompt";
import { games } from "./games/registry";

const DictionaryPage = lazy(() =>
  import("./dictionary/DictionaryPage").then((m) => ({
    default: m.DictionaryPage,
  })),
);

// Lazy for the same reason the dictionary is: prose nobody opens mid-game
// has no business in the bundle that has to boot the hub.
const PrivacyPage = lazy(() =>
  import("./legal/PrivacyPage").then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import("./legal/TermsPage").then((m) => ({ default: m.TermsPage })),
);

function lazyPage(Page: React.ComponentType) {
  return (
    <Suspense
      fallback={
        <div className="flex grow items-center justify-center text-ink-soft">
          Loading…
        </div>
      }
    >
      <Page />
    </Suspense>
  );
}

function GameLayout() {
  return (
    <>
      <Outlet />
      <StoragePrompt />
    </>
  );
}

const gameRoutes: RouteObject[] = games.map((game) => ({
  path: `/games/${game.id}`,
  element: <GameLayout />,
  children: [
    { index: true, element: lazyPage(game.Page) },
    ...(game.extraRoutes ?? []).map((route) => ({
      path: route.path,
      element: lazyPage(route.Page),
    })),
  ],
}));

export const router = createBrowserRouter([
  {
    // Root layout route: catches lazy-chunk load failures after a new
    // deploy (auto-reloads once) and rendering errors anywhere below.
    element: <Outlet />,
    errorElement: <RouteError />,
    children: [
      { path: "/", element: <HubPage /> },
      { path: "/dictionary", element: lazyPage(DictionaryPage) },
      { path: "/privacy", element: lazyPage(PrivacyPage) },
      { path: "/terms", element: lazyPage(TermsPage) },
      ...gameRoutes,
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
