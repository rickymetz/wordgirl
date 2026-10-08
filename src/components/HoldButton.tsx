import { useCallback, useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

/** How long a full press-and-hold takes, unless the caller overrides it. */
export const HOLD_MS = 1000;

/** How fast the fill retreats when a hold is abandoned. */
const RELEASE_MS = 160;

interface Props {
  /** Fires once, the moment the hold completes. */
  onHoldComplete: () => void;
  /**
   * A click that no press began: what Voice Control, Switch Access and a
   * screen reader's double-tap send — they can't hold. Give them another
   * way through (a confirmation dialog), or the control is unreachable.
   * A finger or key that pressed and let go early is NOT this: that is a
   * hold abandoned, and it stays a no-op.
   */
  onTapFallback?: () => void;
  /** Hold duration in ms. */
  holdMs?: number;
  children: ReactNode;
  disabled?: boolean;
  /** Utilities for the button itself (shape, color, spacing). */
  className?: string;
  "aria-label"?: string;
}

/**
 * A button that only fires after the press is HELD for `holdMs` — the
 * house guard for one-way actions (skipping a level, resetting a
 * board) where a stray tap would cost the player something.
 *
 * A fill sweeps the button as the hold progresses and retreats if the
 * press is released, dragged off, or cancelled. Space/Enter hold too:
 * keyboard players get the same gesture rather than a one-shot
 * fallback.
 *
 * Sizing and color come from `className` — the component owns only the
 * gesture, the sweep, and the touch floor.
 */
export function HoldButton({
  onHoldComplete,
  onTapFallback,
  holdMs = HOLD_MS,
  children,
  disabled,
  className = "",
  "aria-label": ariaLabel,
}: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<number | null>(null);
  // Set by a pointer or key press; a click that arrives without one is
  // an assistive-tech activation (see onTapFallback).
  const pressedRef = useRef(false);
  const hintId = useId();

  // The sweep is a background LAYER, not a child element: a background
  // is clipped by the button's own border-radius for free, which lets
  // the touch-target ::after spill past the box without `overflow-
  // hidden` eating it. Written straight to style, so a hold costs ZERO
  // renders — the sweep never touches React state.
  const paint = useCallback((to: 0 | 1, ms: number) => {
    const el = buttonRef.current;
    if (!el) return;
    // !important: the global reduced-motion rule forces every transition
    // to 0.01ms, which would fill the sweep instantly while the action
    // still waits the full hold — a player who lets go when it LOOKS
    // full cancels without knowing. The sweep is progress, not
    // decoration, so it keeps its real duration.
    el.style.setProperty("transition", `background-size ${ms}ms linear`, "important");
    el.style.backgroundSize = `${to * 100}% 100%`;
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    paint(0, RELEASE_MS);
  }, [paint]);

  const start = useCallback(() => {
    // Already counting down (a second finger, a key repeat) — ignore.
    if (disabled || timerRef.current !== null) return;
    // Snap to empty first. Re-pressing while an abandoned hold is still
    // retreating would otherwise resume the sweep from wherever the
    // retreat had reached, showing a bar that is (say) 40% full for a
    // hold that just started — the timer restarts, so the fill must too.
    const el = buttonRef.current;
    if (el) {
      el.style.setProperty("transition", "none", "important");
      el.style.backgroundSize = "0% 100%";
      void el.offsetWidth; // flush, so the reset is not coalesced away
    }
    paint(1, holdMs);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      paint(0, RELEASE_MS);
      onHoldComplete();
    }, holdMs);
  }, [disabled, holdMs, onHoldComplete, paint]);

  // A hold interrupted by an unmount must not fire after the fact.
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (disabled) cancel();
  }, [disabled, cancel]);

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={hintId}
      // Taps on a game surface must never steal focus from the board.
      onPointerDown={(e) => {
        e.preventDefault();
        pressedRef.current = true;
        // Touch implicitly captures the pointer, which would suppress
        // the leave event — release it so dragging a finger off the
        // button aborts the hold the way it does with a mouse.
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        start();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      // Dragging off the button aborts, the same as lifting off it.
      onPointerLeave={cancel}
      onKeyDown={(e) => {
        if (e.repeat) return;
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          pressedRef.current = true;
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") cancel();
      }}
      onBlur={cancel}
      onClick={() => {
        const pressed = pressedRef.current;
        pressedRef.current = false;
        if (!pressed && !disabled) onTapFallback?.();
      }}
      // The ::after is the 44px touch floor — an invisible expansion, so
      // a hold survives thumb drift without the button claiming 44px of
      // layout height on screens that are already budgeted to the pixel.
      className={`relative inline-flex items-center justify-center touch-manipulation select-none outline-none after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-[''] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-40 ${className}`}
      style={{
        touchAction: "manipulation",
        // One layer: the fill, with its last 2px in the label's own
        // color so the leading edge stays legible even on an accent the
        // fill barely shifts. `calc` resolves against the layer's own
        // box, so the rule tracks the sweep.
        backgroundImage:
          "linear-gradient(to right, var(--color-press-fill) calc(100% - 2px), currentColor calc(100% - 2px))",
        backgroundRepeat: "no-repeat",
        backgroundSize: "0% 100%",
      }}
    >
      <span className="pointer-events-none flex items-center gap-1.5">
        {children}
      </span>
      {/* Every HoldButton describes itself the same way, so screen
          readers learn the gesture before the press rather than after
          a silent tap. */}
      <span id={hintId} className="sr-only">
        press and hold to activate
      </span>
    </button>
  );
}
