import { useEffect } from "react";
import { useRouteError } from "react-router-dom";

/** Failed lazy-chunk loads after a fresh deploy leave this signature. */
function isStaleChunkError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  return /failed to fetch dynamically imported module|not a valid javascript mime type|error loading dynamically imported module|importing a module script failed/i.test(
    message,
  );
}

/**
 * Route error boundary. A navigation that hits a chunk from a previous
 * deploy (the "'text/html' is not a valid JavaScript MIME type" error)
 * auto-reloads ONCE to pick up the fresh build; anything else gets a
 * friendly recovery screen instead of the raw stack.
 */
export function RouteError() {
  const error = useRouteError();

  useEffect(() => {
    if (!isStaleChunkError(error)) return;
    const key = "wg:chunk-reload";
    if (sessionStorage.getItem(key)) return; // don't reload-loop
    sessionStorage.setItem(key, "1");
    window.location.reload();
  }, [error]);

  // Clear the one-shot guard once a page renders fine again.
  useEffect(() => {
    return () => sessionStorage.removeItem("wg:chunk-reload");
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-md grow flex-col items-center justify-center gap-4 px-5 text-center md:max-w-xl">
      <h1 className="text-xl font-bold">Something went sideways</h1>
      <p className="text-sm text-ink-soft">
        {isStaleChunkError(error)
          ? "A new version of WordGirl just shipped — reloading…"
          : "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={() => {
          sessionStorage.removeItem("wg:chunk-reload");
          window.location.reload();
        }}
        className="rounded-full bg-accent px-6 py-3 font-semibold text-surface active:scale-95"
      >
        Reload
      </button>
    </div>
  );
}
