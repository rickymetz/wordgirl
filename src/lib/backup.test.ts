import { describe, expect, it } from "vitest";
import {
  BACKUP_PREFIX,
  backupFilename,
  createBackup,
  parseBackup,
  restoreBackup,
  summarizeBackup,
  type Backup,
} from "./backup";
import type { StorageAdapter } from "./storage/types";

/** In-memory StorageAdapter, same contract as the localStorage one. */
function fakeAdapter(initial: Record<string, unknown> = {}): StorageAdapter & {
  dump: () => Record<string, unknown>;
} {
  const map = new Map(Object.entries(initial));
  return {
    get: async <T,>(key: string) => (map.has(key) ? (map.get(key) as T) : null),
    set: async (key, value) => void map.set(key, value),
    remove: async (key) => void map.delete(key),
    keys: async (prefix = "") =>
      [...map.keys()].filter((k) => k.startsWith(prefix)),
    dump: () => Object.fromEntries(map),
  };
}

const k = (rest: string) => BACKUP_PREFIX + rest;

describe("createBackup", () => {
  it("collects every namespaced key and nothing else", async () => {
    const adapter = fakeAdapter({
      [k("polygram:daily:2026-08-17")]: { solved: true },
      [k("settings")]: { theme: "dark" },
      "some-other-app": { nope: true },
    });
    const backup = await createBackup(adapter, new Date("2026-08-17T12:00:00Z"));
    expect(Object.keys(backup.data).sort()).toEqual([
      k("polygram:daily:2026-08-17"),
      k("settings"),
    ]);
    expect(backup.app).toBe("wordgirl");
    expect(backup.exportedAt).toBe("2026-08-17T12:00:00.000Z");
  });

  it("is empty but valid for a profile that has never played", async () => {
    const backup = await createBackup(fakeAdapter());
    expect(backup.data).toEqual({});
    expect(parseBackup(JSON.stringify(backup)).ok).toBe(true);
  });

  it("survives a round trip through JSON", async () => {
    const adapter = fakeAdapter({ [k("doublet:stats")]: { played: 3 } });
    const backup = await createBackup(adapter);
    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok && result.backup.data).toEqual(backup.data);
  });
});

describe("backupFilename", () => {
  it("carries the local date, so files sort by day", () => {
    expect(backupFilename(new Date(2026, 7, 17, 9, 30))).toBe(
      "wordgirl-backup-2026-08-17.json",
    );
  });
});

describe("parseBackup", () => {
  const valid = {
    app: "wordgirl",
    format: 1,
    exportedAt: "2026-08-17T12:00:00.000Z",
    data: { [k("polygram:daily:2026-08-17")]: { solved: true } },
  };

  it("accepts a well-formed backup", () => {
    const result = parseBackup(JSON.stringify(valid));
    expect(result.ok).toBe(true);
  });

  it.each([
    ["not json at all", "{nope"],
    ["a JSON array", "[]"],
    ["a bare string", '"hello"'],
    ["null", "null"],
    ["another app's file", JSON.stringify({ app: "elsewhere", data: {} })],
    ["a missing format", JSON.stringify({ app: "wordgirl", data: {} })],
    [
      "a missing data object",
      JSON.stringify({ app: "wordgirl", format: 1 }),
    ],
  ])("rejects %s", (_label, text) => {
    const result = parseBackup(text);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error.length).toBeGreaterThan(0);
  });

  it("rejects a backup from a newer app version", () => {
    const result = parseBackup(JSON.stringify({ ...valid, format: 99 }));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/newer version/);
  });

  it("rejects a file smuggling a key outside our namespace", () => {
    // The security case: import writes whatever keys the file names, so
    // a foreign key must sink the whole file, not be quietly skipped.
    const result = parseBackup(
      JSON.stringify({
        ...valid,
        data: { ...valid.data, "evil:key": "payload" },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/aren't WordGirl's/);
  });
});

describe("summarizeBackup", () => {
  it("counts day saves and distinct games, ignoring non-game keys", () => {
    const backup: Backup = {
      app: "wordgirl",
      format: 1,
      exportedAt: "",
      data: {
        [k("polygram:daily:2026-08-16")]: {},
        [k("polygram:daily:2026-08-17")]: {},
        [k("polygram:stats")]: {},
        [k("doublet:daily:2026-08-17")]: {},
        [k("settings")]: {},
        [k("dictionary:bookmarks")]: {},
      },
    };
    expect(summarizeBackup(backup)).toMatchObject({ days: 3, games: 2 });
  });

  it("reports zeroes for an empty backup", () => {
    const backup: Backup = {
      app: "wordgirl",
      format: 1,
      exportedAt: "",
      data: {},
    };
    expect(summarizeBackup(backup)).toMatchObject({ days: 0, games: 0 });
  });
});

describe("restoreBackup", () => {
  it("replaces rather than merges, clearing days the backup lacks", async () => {
    const adapter = fakeAdapter({
      [k("polygram:daily:2026-08-01")]: { stale: true },
      [k("settings")]: { theme: "light" },
    });
    await restoreBackup(
      {
        app: "wordgirl",
        format: 1,
        exportedAt: "",
        data: { [k("polygram:daily:2026-08-17")]: { solved: true } },
      },
      adapter,
    );
    expect(adapter.dump()).toEqual({
      [k("polygram:daily:2026-08-17")]: { solved: true },
    });
  });

  it("leaves keys outside the namespace alone", async () => {
    const adapter = fakeAdapter({
      [k("settings")]: { theme: "light" },
      "unrelated-key": "keep me",
    });
    await restoreBackup(
      { app: "wordgirl", format: 1, exportedAt: "", data: {} },
      adapter,
    );
    expect(adapter.dump()).toEqual({ "unrelated-key": "keep me" });
  });

  it("round-trips a real export back to the same state", async () => {
    const original = {
      [k("polygram:daily:2026-08-17")]: { solved: true, hints: 2 },
      [k("serpentine:stats")]: { played: 9 },
      [k("settings")]: { theme: "dark", font: "accessible" },
    };
    const source = fakeAdapter(original);
    const backup = await createBackup(source);

    const target = fakeAdapter({ [k("polygram:daily:1999-01-01")]: {} });
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) await restoreBackup(parsed.backup, target);
    expect(target.dump()).toEqual(original);
  });
});
