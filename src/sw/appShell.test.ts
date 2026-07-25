import { describe, expect, it, vi } from "vitest";
import {
  offlineShellResponse,
  respondWithShell,
  type ShellSources,
} from "./appShell";

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
