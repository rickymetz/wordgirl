/**
 * "Is this a constrained device?" — a best-effort guess, because the
 * platform gives CSS nothing to answer it with. There is NO media query
 * for CPU/GPU/RAM; the only power-adjacent hints are JS
 * (`navigator.deviceMemory`, Save-Data) and one partial CSS proxy
 * (`prefers-reduced-data`). So we read the JS hints ONCE at boot and stamp
 * `html[data-low-power]`, which the stylesheet can then target like any
 * other root flag — turning "expensive-on-weak-hardware" effects (the
 * roundup's animated blur) down without touching capable phones.
 *
 * Heuristic, and deliberately conservative so it never degrades a mid or
 * high-end device:
 *  - Save-Data on  → the user explicitly asked to spend less; honour it.
 *  - deviceMemory ≤ 4 GB → a budget Android. (Chromium-only and rounded to
 *    coarse buckets; undefined on Safari/Firefox, where we assume capable —
 *    those platforms skew to hardware that handles it.)
 */
interface Capabilities {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

export function isLowPowerDevice(
  nav: Navigator & Capabilities = navigator,
): boolean {
  if (nav.connection?.saveData === true) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) {
    return true;
  }
  return false;
}

/** Stamp the root once at boot so CSS can gate on it. No-op off the flag. */
export function applyLowPowerFlag(root: HTMLElement = document.documentElement): void {
  if (isLowPowerDevice()) root.dataset.lowPower = "true";
  else delete root.dataset.lowPower;
}
