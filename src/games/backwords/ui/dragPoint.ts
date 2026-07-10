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

/**
 * motion fires onDragEnd for pointercancel too — the system taking the
 * gesture back (notification banner, incoming call, edge swipe). A
 * cancelled drag must ABORT, never count as a drop.
 */
export function dragCancelled(
  e?: MouseEvent | TouchEvent | PointerEvent,
): boolean {
  return e?.type === "pointercancel" || e?.type === "touchcancel";
}
