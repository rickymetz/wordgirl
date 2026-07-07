/**
 * Bridge between the service-worker registration (captured at boot in
 * main.tsx) and the Settings "Check for updates" button. The app runs
 * registerType: "autoUpdate", so when a check finds a new build the
 * worker activates on its own and the page reloads itself — the button
 * only triggers the check and reports what it found.
 */

let registration: ServiceWorkerRegistration | null = null;

export function setSWRegistration(r: ServiceWorkerRegistration) {
  registration = r;
}

export type UpdateCheckResult =
  | "updating" // new build found — installing; the app will refresh
  | "current" // already on the latest build
  | "failed" // check didn't complete (offline, server unreachable)
  | "unavailable"; // no SW here (dev server, unsupported browser)

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  if (!registration) return "unavailable";
  try {
    await registration.update();
  } catch {
    return "failed";
  }
  return registration.installing || registration.waiting
    ? "updating"
    : "current";
}
