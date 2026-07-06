import { Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { HubPage } from "./hub/HubPage";
import { games } from "./games/registry";

function lazyPage(Page: React.ComponentType) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-ink-soft">
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
  { path: "/", element: <HubPage /> },
  ...gameRoutes,
  { path: "*", element: <Navigate to="/" replace /> },
]);
