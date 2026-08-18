import { beforeEach, describe, expect, it } from "vitest";
import { GAME_ID_RENAMES, migrateRenamedGames } from "./renames";

const OLD = "wg:v1:local:backwords:";
const NEW = "wg:v1:local:pierglass:";

beforeEach(() => localStorage.clear());

describe("migrateRenamedGames", () => {
  it("moves every key behind the retired prefix", () => {
    localStorage.setItem(`${OLD}daily:2026-08-17`, '{"solved":true}');
    localStorage.setItem(`${OLD}stats`, '{"played":12,"streak":4}');
    localStorage.setItem(`${OLD}tutorialSeen`, "true");

    expect(migrateRenamedGames()).toBe(3);

    expect(localStorage.getItem(`${NEW}daily:2026-08-17`)).toBe('{"solved":true}');
    expect(localStorage.getItem(`${NEW}stats`)).toBe('{"played":12,"streak":4}');
    expect(localStorage.getItem(`${NEW}tutorialSeen`)).toBe("true");
    // And the old namespace is gone, so a later run has nothing to do.
    expect(Object.keys(localStorage).filter((k) => k.startsWith(OLD))).toEqual([]);
  });

  it("leaves other games and app settings alone", () => {
    localStorage.setItem("wg:v1:local:polygram:daily:2026-08-17", "{}");
    localStorage.setItem("wg:v1:local:settings", '{"theme":"dark"}');
    localStorage.setItem("unrelated", "keep");

    migrateRenamedGames();

    expect(localStorage.getItem("wg:v1:local:polygram:daily:2026-08-17")).toBe("{}");
    expect(localStorage.getItem("wg:v1:local:settings")).toBe('{"theme":"dark"}');
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });

  it("is idempotent — a second run is a no-op", () => {
    localStorage.setItem(`${OLD}daily:2026-08-17`, '{"solved":true}');
    expect(migrateRenamedGames()).toBe(1);
    expect(migrateRenamedGames()).toBe(0);
    expect(localStorage.getItem(`${NEW}daily:2026-08-17`)).toBe('{"solved":true}');
  });

  it("never clobbers a save already under the new id", () => {
    // Both exist only if the player has played since the rename; that
    // save is the newer truth and must win.
    localStorage.setItem(`${OLD}stats`, '{"played":1}');
    localStorage.setItem(`${NEW}stats`, '{"played":99}');

    migrateRenamedGames();

    expect(localStorage.getItem(`${NEW}stats`)).toBe('{"played":99}');
    expect(localStorage.getItem(`${OLD}stats`)).toBeNull();
  });

  it("runs clean on a browser that never played the old game", () => {
    expect(() => migrateRenamedGames()).not.toThrow();
    expect(migrateRenamedGames()).toBe(0);
  });

  it("survives storage throwing, rather than taking the boot down", () => {
    const hostile = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    } as unknown as Storage;
    expect(() => migrateRenamedGames(hostile)).not.toThrow();
  });

  it("keeps the rename table honest", () => {
    // A rename entry pointing at itself would loop keys through a no-op
    // move and delete them.
    for (const [from, to] of GAME_ID_RENAMES) {
      expect(from).not.toBe(to);
      expect(from.length).toBeGreaterThan(0);
      expect(to.length).toBeGreaterThan(0);
    }
  });
});

describe("the retired id stays retired", () => {
  it("is not referenced anywhere in src except this migration", async () => {
    // A rename is easy to half-undo: someone copies an old file, or a
    // merge resurrects a path. The migration is the ONLY place the old
    // id may appear, and it must keep appearing there — deleting it
    // would strand every save still behind the old prefix.
    const { readdirSync, readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const SRC = path.join(import.meta.dirname, "..", "..");
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) return walk(full);
        return /\.tsx?$/.test(e.name) ? [full] : [];
      });
    const offenders = walk(SRC).filter(
      (f) =>
        !f.includes("renames") &&
        /backwords/i.test(readFileSync(f, "utf8")),
    );
    expect(
      offenders.map((f) => path.relative(SRC, f)),
      'The retired id "backwords" reappeared in src. Rename it to pierglass.',
    ).toEqual([]);
  });

  it("still carries the rename, so old saves are not stranded", () => {
    expect(GAME_ID_RENAMES.some(([from]) => from === "backwords")).toBe(true);
  });
});
