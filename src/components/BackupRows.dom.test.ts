import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BackupRows } from "./BackupRows";
import { BACKUP_PREFIX } from "../lib/backup";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root;
let sent: string[];
let downloaded: { name: string; blob: Blob }[];
let reloads: number;

const k = (rest: string) => BACKUP_PREFIX + rest;

/** The anchor click and object URL are the only bits jsdom cannot do. */
function stubDownloads() {
  downloaded = [];
  let lastBlob: Blob | null = null;
  URL.createObjectURL = vi.fn((blob: Blob) => {
    lastBlob = blob;
    return "blob:stub";
  }) as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn();
  const realClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    if (this.download) downloaded.push({ name: this.download, blob: lastBlob! });
    else realClick.call(this);
  };
}

beforeEach(() => {
  localStorage.clear();
  sent = [];
  reloads = 0;
  window.fathom = { trackEvent: (name: string) => sent.push(name) };
  stubDownloads();
  // jsdom refuses a real navigation; count the call instead.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, reload: () => void (reloads += 1) },
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
  act(() => {
    root.render(createElement(BackupRows));
  });
});

afterEach(() => {
  delete window.fathom;
  act(() => root.unmount());
  container.remove();
});

function button(label: string): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === label,
  );
  if (!found) throw new Error(`no button labelled "${label}"`);
  return found as HTMLButtonElement;
}

/** jsdom's Blob has no .text(); FileReader is the portable way in. */
function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

/** FileReader resolves over several macrotasks in jsdom, not just one. */
async function flush(ticks = 10) {
  for (let i = 0; i < ticks; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

async function pickFile(text: string) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const file = new File([text], "backup.json", { type: "application/json" });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await flush();
}

describe("BackupRows", () => {
  it("offers both actions", () => {
    expect(button("Save a backup")).toBeTruthy();
    expect(button("Restore a backup")).toBeTruthy();
  });

  it("saves a dated file holding the namespaced keys, and reports it", async () => {
    localStorage.setItem(k("polygram:daily:2026-08-17"), '{"solved":true}');
    localStorage.setItem("unrelated", "ignored");
    await act(async () => {
      button("Save a backup").click();
    });
    await flush();
    expect(downloaded).toHaveLength(1);
    expect(downloaded[0].name).toMatch(/^wordgirl-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const text = await blobText(downloaded[0].blob);
    const parsed = JSON.parse(text);
    expect(Object.keys(parsed.data)).toEqual([k("polygram:daily:2026-08-17")]);
    expect(sent).toContain("backup:export");
    expect(container.textContent).toContain("Backup saved");
  });

  it("explains a file that is not a backup, and writes nothing", async () => {
    await pickFile("just some text");
    expect(container.textContent).toMatch(/isn't valid JSON/);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(sent).not.toContain("backup:restore");
  });

  it("refuses a file carrying keys outside the namespace", async () => {
    await pickFile(
      JSON.stringify({
        app: "wordgirl",
        format: 1,
        data: { "evil:key": "payload" },
      }),
    );
    expect(container.textContent).toMatch(/aren't WordGirl's/);
    expect(localStorage.getItem("evil:key")).toBeNull();
  });

  it("confirms before replacing, and cancelling changes nothing", async () => {
    localStorage.setItem(k("polygram:daily:2026-08-01"), "{}");
    await pickFile(
      JSON.stringify({
        app: "wordgirl",
        format: 1,
        data: { [k("polygram:daily:2026-08-17")]: { solved: true } },
      }),
    );
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    // The warning must say what is lost, not just that something changes.
    expect(dialog!.textContent).toMatch(/replaces the progress/);
    expect(dialog!.textContent).toMatch(/1 saved day across 1 game/);

    await act(async () => {
      button("Cancel").click();
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(localStorage.getItem(k("polygram:daily:2026-08-01"))).toBe("{}");
    expect(reloads).toBe(0);
  });

  it("replaces local progress and reloads once confirmed", async () => {
    localStorage.setItem(k("polygram:daily:2026-08-01"), "{}");
    await pickFile(
      JSON.stringify({
        app: "wordgirl",
        format: 1,
        data: { [k("polygram:daily:2026-08-17")]: { solved: true } },
      }),
    );
    await act(async () => {
      button("Replace and reload").click();
    });
    await flush();
    expect(localStorage.getItem(k("polygram:daily:2026-08-01"))).toBeNull();
    expect(localStorage.getItem(k("polygram:daily:2026-08-17"))).toBe(
      '{"solved":true}',
    );
    expect(sent).toContain("backup:restore");
    expect(reloads).toBe(1);
  });
});

describe("Escape inside the confirmation", () => {
  it("is consumed by the dialog, not the sheet behind it", async () => {
    // A ModalDialog opens on top of the settings BottomSheet, and both
    // listen on window. One Escape must dismiss only the topmost.
    const sheetCloses: number[] = [];
    const onSheetEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") sheetCloses.push(1);
    };
    // Bubble-phase window listener, registered first — exactly how
    // BottomSheet does it.
    window.addEventListener("keydown", onSheetEscape);
    try {
      await pickFile(
        JSON.stringify({
          app: "wordgirl",
          format: 1,
          data: { [k("polygram:daily:2026-08-17")]: { solved: true } },
        }),
      );
      expect(document.querySelector('[role="dialog"]')).toBeTruthy();
      await act(async () => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      });
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(sheetCloses).toEqual([]);
    } finally {
      window.removeEventListener("keydown", onSheetEscape);
    }
  });
});
