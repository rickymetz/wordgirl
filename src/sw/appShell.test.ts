import { describe, expect, it, vi } from "vitest";
import {
  BACKUP_AFTER_MS,
  OFFLINE_AFTER_MS,
  offlineShellResponse,
  respondWithShell,
  type ShellSources,
} from "./appShell";

/**
 * Stands in for the real timer so a stalled network costs the suite
 * nothing. Records what it was asked to wait for and resolves on the
 * next tick, which is enough to lose every race against a promise that
 * has not settled.
 */
function fakeWait() {
  const asked: number[] = [];
  const wait = (ms: number) => {
    asked.push(ms);
    return new Promise((done) => setTimeout(done, 0));
  };
  return Object.assign(wait, { asked });
}

/** A fetch that never answers — the stalled-network case. */
const stalls = () => new Promise<Response>(() => {});

function shell(body = "<html>app</html>", init?: ResponseInit) {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/html" },
    ...init,
  });
}

function sources(overrides: Partial<ShellSources> = {}): ShellSources {
  return {
    fromPrecache: async () => shell(),
    readBackup: async () => undefined,
    writeBackup: async () => undefined,
    ...overrides,
  };
}

describe("respondWithShell", () => {
  it("serves the precached shell when it is there", async () => {
    const response = await respondWithShell(sources());
    expect(await response.text()).toBe("<html>app</html>");
  });

  it("backs up every shell it serves, off the navigation's critical path", async () => {
    const writeBackup = vi.fn(async (_response: Response) => undefined);
    const kept: Promise<unknown>[] = [];

    const response = await respondWithShell(sources({ writeBackup }), (work) =>
      kept.push(work),
    );

    // The response is readable — the backup took a clone, not the body.
    expect(await response.text()).toBe("<html>app</html>");
    expect(writeBackup).toHaveBeenCalledTimes(1);
    expect(await writeBackup.mock.calls[0][0].text()).toBe("<html>app</html>");
    expect(kept).toHaveLength(1);
    await Promise.all(kept);
  });

  it("falls back to the backup when the precache handler rejects", async () => {
    // Precache evicted + the network fetch fails: the case that used to
    // reject the fetch event and blank the installed app.
    const response = await respondWithShell(
      sources({
        fromPrecache: () => Promise.reject(new TypeError("Load failed")),
        readBackup: async () => shell("<html>backup</html>"),
      }),
    );
    expect(await response.text()).toBe("<html>backup</html>");
  });

  it("falls back to the backup when the shell answers non-ok", async () => {
    const response = await respondWithShell(
      sources({
        fromPrecache: async () => shell("nope", { status: 503 }),
        readBackup: async () => shell("<html>backup</html>"),
      }),
    );
    expect(await response.text()).toBe("<html>backup</html>");
  });

  it("does not overwrite the backup with a failed response", async () => {
    const writeBackup = vi.fn(async (_response: Response) => undefined);
    await respondWithShell(
      sources({
        fromPrecache: async () => shell("nope", { status: 503 }),
        readBackup: async () => shell("<html>backup</html>"),
        writeBackup,
      }),
    );
    expect(writeBackup).not.toHaveBeenCalled();
  });

  it("serves the offline page when nothing is cached and the network is down", async () => {
    const response = await respondWithShell(
      sources({
        fromPrecache: () => Promise.reject(new TypeError("Load failed")),
        readBackup: async () => undefined,
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("WordGirl did not load");
  });

  it("serves the offline page when Cache Storage itself is unavailable", async () => {
    const response = await respondWithShell(
      sources({
        fromPrecache: () => Promise.reject(new TypeError("Load failed")),
        readBackup: () => Promise.reject(new Error("no cache")),
      }),
    );
    expect(await response.text()).toContain("WordGirl did not load");
  });

  it("opens from the backup when the network stalls instead of failing", async () => {
    // The reported symptom after the first fix: not an error, just a
    // launch that hangs. iOS gives a stalled fetch a minute or more.
    const wait = fakeWait();
    const response = await respondWithShell(
      sources({
        fromPrecache: stalls,
        readBackup: async () => shell("<html>backup</html>"),
      }),
      () => {},
      wait,
    );
    expect(await response.text()).toBe("<html>backup</html>");
    expect(wait.asked[0]).toBe(BACKUP_AFTER_MS);
  });

  it("refreshes the backup when the stalled shell finally lands", async () => {
    let land: (response: Response) => void = () => {};
    const writeBackup = vi.fn(async (_response: Response) => undefined);
    const kept: Promise<unknown>[] = [];

    const response = await respondWithShell(
      sources({
        fromPrecache: () => new Promise<Response>((res) => (land = res)),
        readBackup: async () => shell("<html>backup</html>"),
        writeBackup,
      }),
      (work) => kept.push(work),
      fakeWait(),
    );

    expect(await response.text()).toBe("<html>backup</html>");
    expect(writeBackup).not.toHaveBeenCalled();
    land(shell("<html>fresh</html>"));
    await Promise.all(kept);
    expect(await writeBackup.mock.calls[0][0].text()).toBe("<html>fresh</html>");
  });

  it("waits longer for a stalled shell when there is no backup", async () => {
    const wait = fakeWait();
    const response = await respondWithShell(
      sources({ fromPrecache: stalls, readBackup: async () => undefined }),
      () => {},
      wait,
    );
    expect(await response.text()).toContain("WordGirl did not load");
    // The full deadline is spent before giving up on the real shell.
    expect(wait.asked).toEqual([
      BACKUP_AFTER_MS,
      OFFLINE_AFTER_MS - BACKUP_AFTER_MS,
    ]);
  });

  it("still serves a slow shell that arrives within the full deadline", async () => {
    let land: (response: Response) => void = () => {};
    const slow = new Promise<Response>((res) => (land = res));
    const wait = (ms: number) =>
      new Promise((done) => {
        // Land the shell during the second, longer window.
        if (ms !== BACKUP_AFTER_MS) land(shell("<html>slow</html>"));
        setTimeout(done, 0);
      });

    const response = await respondWithShell(
      sources({ fromPrecache: () => slow, readBackup: async () => undefined }),
      () => {},
      wait,
    );
    expect(await response.text()).toBe("<html>slow</html>");
  });

  it("never lets a backup-write failure break the navigation", async () => {
    const kept: Promise<unknown>[] = [];
    const response = await respondWithShell(
      sources({ writeBackup: () => Promise.reject(new Error("quota")) }),
      (work) => kept.push(work),
    );
    expect(await response.text()).toBe("<html>app</html>");
    await expect(Promise.all(kept)).resolves.toBeDefined();
  });
});

describe("offlineShellResponse", () => {
  it("answers 200 so the browser cannot substitute its own error page", () => {
    // A failure status is what leaves an installed iOS app blank.
    expect(offlineShellResponse().status).toBe(200);
  });

  it("is a self-contained document — no external css, script, or font", async () => {
    const html = await offlineShellResponse().text();
    expect(html).toContain('<meta name="viewport"');
    expect(html).toContain('<a href="/">');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<link/i);
  });

  it("is served as html and never cached", () => {
    const headers = offlineShellResponse().headers;
    expect(headers.get("Content-Type")).toContain("text/html");
    expect(headers.get("Cache-Control")).toBe("no-store");
  });
});
