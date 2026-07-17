import { useCallback, useEffect, useState } from "react";
import { ModalDialog } from "./ModalDialog";

const DISMISSED_KEY = "wg:storage-prompt-dismissed";

function firefoxLike() {
  return /Firefox\//.test(navigator.userAgent);
}

export function StoragePrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!navigator.storage?.persist) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    let cancelled = false;
    let observer: MutationObserver | undefined;

    void navigator.storage.persisted().then((already) => {
      if (already || cancelled) return;

      if (!firefoxLike()) {
        localStorage.setItem(DISMISSED_KEY, "1");
        void navigator.storage.persist().catch(() => {});
        return;
      }

      observer = waitForNoDialog(() => {
        if (!cancelled) setVisible(true);
      });
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  }, []);

  const allow = useCallback(() => {
    dismiss();
    void navigator.storage.persist().catch(() => {});
  }, [dismiss]);

  if (!visible) return null;

  return (
    <ModalDialog labelledBy="storage-prompt-title">
      <h2
        id="storage-prompt-title"
        className="text-lg font-semibold text-ink"
      >
        Keep your streaks safe
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        WordGirl saves your progress, streaks, and stats on this device. Your
        browser may clear that data when storage runs low unless you allow
        persistent storage.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        On the next prompt, tap <strong className="text-ink">Allow</strong> to
        protect your data.
      </p>
      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full px-5 py-2 text-sm font-medium text-ink-soft active:scale-95"
        >
          Not now
        </button>
        <button
          type="button"
          data-autofocus
          onClick={allow}
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-on-accent active:scale-95"
        >
          Continue
        </button>
      </div>
    </ModalDialog>
  );
}

function waitForNoDialog(cb: () => void): MutationObserver | undefined {
  if (!document.querySelector("[aria-modal]")) {
    cb();
    return undefined;
  }
  const observer = new MutationObserver(() => {
    if (!document.querySelector("[aria-modal]")) {
      observer.disconnect();
      cb();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}
