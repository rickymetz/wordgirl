import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BackupPrompt } from "./BackupPrompt";
import { BACKUP_PREFIX } from "../lib/backup";
import { REMINDER_MIN_DAYS } from "../lib/backupReminder";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root;
let sent: string[];
let downloads: number;

const k = (rest: string) => BACKUP_PREFIX + rest;
const STATE_KEY = k("backup");

function seedDays(n: number) {
  for (let i = 0; i < n; i++) {
    localStorage.setItem(k(`polygram:daily:2026-08-${String(i + 1).padStart(2, "0")}`), "{}");
  }
}

async function flush(ticks = 6) {
  for (let i = 0; i < ticks; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
  act(() => {
    root.render(createElement(BackupPrompt));
  });
  await flush();
}

function button(label: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === label,
  );
  if (!found) throw new Error(`no button labelled "${label}"`);
  return found as HTMLButtonElement;
}

beforeEach(() => {
  localStorage.clear();
  sent = [];
  downloads = 0;
  window.fathom = { trackEvent: (name: string) => sent.push(name) };
  URL.createObjectURL = vi.fn(() => "blob:stub") as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn();
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    if (this.download) downloads += 1;
  };
});

afterEach(() => {
  delete window.fathom;
  act(() => root.unmount());
  container.remove();
});

describe("BackupPrompt", () => {
  it("renders nothing for a player with little to lose", async () => {
    seedDays(REMINDER_MIN_DAYS - 1);
    await mount();
    expect(container.textContent).toBe("");
    expect(sent).toEqual([]);
  });

  it("offers a backup once a streak is worth protecting", async () => {
    seedDays(REMINDER_MIN_DAYS);
    await mount();
    expect(container.textContent).toContain("Keep your streak safe");
    expect(container.textContent).toContain(`${REMINDER_MIN_DAYS} saved days`);
    // Shown, not mounted — the denominator for backup:export.
    expect(sent).toEqual(["backup:reminder"]);
  });

  it("stays quiet after a recent backup", async () => {
    seedDays(30);
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify({ lastSavedAt: new Date().toISOString() }),
    );
    await mount();
    expect(container.textContent).toBe("");
  });

  it("saves a file, records it, and stops asking", async () => {
    seedDays(30);
    await mount();
    await act(async () => {
      button("Save a backup").click();
    });
    await flush();
    expect(downloads).toBe(1);
    expect(sent).toContain("backup:export");
    expect(container.textContent).toContain("Backup saved");
    const state = JSON.parse(localStorage.getItem(STATE_KEY)!);
    expect(state.lastSavedAt).toBeTruthy();
  });

  it("'Not now' dismisses it and buys silence", async () => {
    seedDays(30);
    await mount();
    await act(async () => {
      button("Not now").click();
    });
    await flush();
    expect(container.textContent).toBe("");
    const state = JSON.parse(localStorage.getItem(STATE_KEY)!);
    expect(state.snoozedAt).toBeTruthy();
    // And it stays gone on the next visit.
    act(() => root.unmount());
    container.remove();
    await mount();
    expect(container.textContent).toBe("");
  });
});

describe("when saving fails", () => {
  it("says so instead of looking like a dead button", async () => {
    seedDays(30);
    await mount();
    // The one failure a player can actually hit: the browser refuses to
    // hand over a file. Without a catch this is an unhandled rejection
    // and the card just sits there.
    HTMLAnchorElement.prototype.click = function () {
      throw new Error("download blocked");
    };
    await act(async () => {
      button("Save a backup").click();
    });
    await flush();
    expect(container.textContent).toContain("Couldn't save the backup");
    expect(container.textContent).not.toContain("Backup saved");
    // And nothing was recorded, so the offer returns rather than being
    // silently marked done.
    expect(localStorage.getItem(STATE_KEY)).toBeNull();
    expect(sent).not.toContain("backup:export");
  });
});
