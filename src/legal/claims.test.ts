import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * The privacy page makes claims about the code. These tests are what stop
 * those claims from quietly going stale.
 *
 * A privacy policy is the one document in the repo that can become a lie
 * without anybody editing it — the page keeps saying "no cookies" while a
 * new dependency starts setting one. Prose cannot be type-checked, so the
 * checkable claims get asserted here instead, and the failure message says
 * which sentence on the page has stopped being true.
 */

const SRC = path.join(import.meta.dirname, "..");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    // src/legal is skipped: these pages NAME the things being banned, in
    // prose and in the comments explaining the ban, so scanning them
    // makes the guard fail on its own documentation.
    if (entry.isDirectory()) {
      if (entry.name !== "legal") out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("privacy page claims", () => {
  const files = sourceFiles(SRC);

  it("finds the app source", () => {
    // Guards the guards: a broken walk would pass every test below.
    expect(files.length).toBeGreaterThan(50);
  });

  it('sets no cookies — "WordGirl sets no cookies at all"', () => {
    const offenders = files.filter((f) =>
      /document\s*\.\s*cookie/.test(readFileSync(f, "utf8")),
    );
    expect(
      offenders.map((f) => path.relative(SRC, f)),
      "Something now writes document.cookie. Update the Cookies section of PrivacyPage.tsx before removing this test.",
    ).toEqual([]);
  });

  it('sends no game data to a server — "None of it is sent anywhere"', () => {
    // Fathom is loaded by a script tag in index.html and reached only
    // through window.fathom, so no app file should be opening a request
    // of its own. Vite's own import machinery is not a network call.
    const offenders = files.filter((f) => {
      const src = readFileSync(f, "utf8");
      return /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource)\s*\(/.test(
        src,
      );
    });
    const allowed = ["lib/words/loader.ts"];
    expect(
      offenders
        .map((f) => path.relative(SRC, f))
        .filter((f) => !allowed.includes(f)),
      "A new network call appeared. Confirm it sends no game progress, then add it to `allowed` — or update PrivacyPage.tsx.",
    ).toEqual([]);
  });
});
