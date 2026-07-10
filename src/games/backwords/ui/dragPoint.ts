import type { PanInfo } from "motion/react";

/**
 * Client-space pointer position from motion's drag callbacks. iOS
 * Safari can hand back a TouchEvent — no clientX on the event itself —
 * so fall back to info.point, which is page-space and needs the
 * scroll offset removed.
 */
export function dragPoint(
  e?: MouseEvent | TouchEvent | PointerEvent,
  info?: PanInfo,
): { x: number; y: number } | null {
  if (e && "clientX" in e) return { x: e.clientX, y: e.clientY };
  if (info)
    return {
      x: info.point.x - window.scrollX,
      y: info.point.y - window.scrollY,
    };
  return null;
}
