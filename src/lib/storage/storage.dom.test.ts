import { beforeEach, describe, expect, it } from "vitest";
import { createLocalStorageAdapter } from "./localStorageAdapter";
import { createGameStore } from "./createGameStore";

beforeEach(() => {
  localStorage.clear();
});

describe("localStorageAdapter", () => {
  it("round-trips values", async () => {
    const store = createLocalStorageAdapter();
    await store.set("k", { a: 1, b: ["x"] });
    expect(await store.get("k")).toEqual({ a: 1, b: ["x"] });
  });

  it("returns null for missing keys", async () => {
    const store = createLocalStorageAdapter();
    expect(await store.get("nope")).toBeNull();
  });

  it("tolerates corrupted JSON", async () => {
    localStorage.setItem("bad", "{not json");
    const store = createLocalStorageAdapter();
    expect(await store.get("bad")).toBeNull();
  });

  it("removes values", async () => {
    const store = createLocalStorageAdapter();
    await store.set("k", 1);
    await store.remove("k");
    expect(await store.get("k")).toBeNull();
  });
});

describe("createGameStore", () => {
  it("namespaces keys per game", async () => {
    const a = createGameStore("polygram");
    const b = createGameStore("othergame");
    await a.set("stats", { played: 3 });
    await b.set("stats", { played: 9 });
    expect(await a.get("stats")).toEqual({ played: 3 });
    expect(await b.get("stats")).toEqual({ played: 9 });
  });

  it("lists keys stripped of namespace", async () => {
    const store = createGameStore("polygram");
    await store.set("daily:2026-07-06", { score: 1 });
    await store.set("daily:2026-07-07", { score: 2 });
    await store.set("stats", {});
    const dailies = await store.keys("daily:");
    expect(dailies.sort()).toEqual(["daily:2026-07-06", "daily:2026-07-07"]);
  });
});
