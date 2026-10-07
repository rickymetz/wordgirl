/**
 * How many modal dialogs/sheets are open right now, app-wide. Every
 * house dialog (ModalDialog, BottomSheet — so CoachSheet, Settings, the
 * hint confirmation, the tutorial offer) takes focus through
 * `useModalFocus`, which holds one count for as long as it is active.
 *
 * The daily clock reads it: a player reading the "?" sheet or deciding
 * on a hint is not playing, so the clock pauses exactly as it does for
 * a hidden tab. A module-level counter rather than context because the
 * dialogs and the clock live in unrelated subtrees, and stacked dialogs
 * (Settings → restore confirmation) must count as one "open".
 */
let openCount = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

/** Mark one modal open; the returned release is idempotent. */
export function holdModalOpen(): () => void {
  openCount++;
  notify();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    openCount--;
    notify();
  };
}

export function isModalOpen(): boolean {
  return openCount > 0;
}

/** Called on every open/close; returns the unsubscribe. */
export function onModalOpenChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
