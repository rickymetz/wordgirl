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

const gameRoutes: RouteObject[] = games.flatMap((game) => [
  { path: `/games/${game.id}`, element: lazyPage(game.Page) },
  ...(game.extraRoutes ?? []).map((route) => ({
    path: `/games/${game.id}/${route.path}`,
    element: lazyPage(route.Page),
  })),
]);

export const router = createBrowserRouter([
  {
    // Root layout route: catches lazy-chunk load failures after a new
    // deploy (auto-reloads once) and rendering errors anywhere below.
    element: (
      <>
        <Outlet />
        <StoragePrompt />
      </>
    ),
    errorElement: <RouteError />,
    children: [
      { path: "/", element: <HubPage /> },
      { path: "/dictionary", element: lazyPage(DictionaryPage) },
      ...gameRoutes,
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
