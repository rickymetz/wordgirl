import { describe, expect, it } from "vitest";
import {
  REMINDER_MIN_DAYS,
  REMINDER_SNOOZE_DAYS,
  REMINDER_STALE_DAYS,
  countSavedDays,
  loadReminderState,
  recordBackupSaved,
  shouldOfferBackup,
  snoozeReminder,
} from "./backupReminder";
import { BACKUP_PREFIX, summarizeBackup, type Backup } from "./backup";
import type { StorageAdapter } from "./storage/types";

function fakeAdapter(initial: Record<string, unknown> = {}): StorageAdapter {
  const map = new Map(Object.entries(initial));
  return {
    get: async <T,>(key: string) => (map.has(key) ? (map.get(key) as T) : null),
    set: async (key, value) => void map.set(key, value),
    remove: async (key) => void map.delete(key),
    keys: async (prefix = "") =>
      [...map.keys()].filter((k) => k.startsWith(prefix)),
  };
}

const k = (rest: string) => BACKUP_PREFIX + rest;
const NOW = new Date("2026-08-17T12:00:00Z");
const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

describe("shouldOfferBackup", () => {
  it("stays quiet until there is something worth losing", () => {
    for (let days = 0; days < REMINDER_MIN_DAYS; days++) {
      expect(
        shouldOfferBackup({ savedDays: days, state: {}, now: NOW }),
      ).toBe(false);
    }
    expect(
      shouldOfferBackup({ savedDays: REMINDER_MIN_DAYS, state: {}, now: NOW }),
    ).toBe(true);
  });

  it("respects a recent 'Not now' and speaks up once it lapses", () => {
    const snoozed = (n: number) =>
      shouldOfferBackup({ savedDays: 30, state: { snoozedAt: daysAgo(n) }, now: NOW });
    expect(snoozed(1)).toBe(false);
    expect(snoozed(REMINDER_SNOOZE_DAYS - 1)).toBe(false);
    expect(snoozed(REMINDER_SNOOZE_DAYS + 1)).toBe(true);
  });

  it("stays quiet while a recent backup still covers the streak", () => {
    const saved = (n: number) =>
      shouldOfferBackup({ savedDays: 30, state: { lastSavedAt: daysAgo(n) }, now: NOW });
    expect(saved(1)).toBe(false);
    expect(saved(REMINDER_STALE_DAYS - 1)).toBe(false);
    expect(saved(REMINDER_STALE_DAYS + 1)).toBe(true);
  });

  it("ignores an unparseable timestamp rather than going silent forever", () => {
    // A corrupt state must not be able to permanently suppress the offer.
    expect(
      shouldOfferBackup({
        savedDays: 30,
        state: { snoozedAt: "not a date", lastSavedAt: "also not" },
        now: NOW,
      }),
    ).toBe(true);
  });
});

describe("countSavedDays", () => {
  it("counts day saves across games, not stats or settings", async () => {
    const adapter = fakeAdapter({
      [k("polygram:daily:2026-08-16")]: {},
      [k("polygram:daily:2026-08-17")]: {},
      [k("serpentine:daily:2026-08-17")]: {},
      [k("polygram:stats")]: {},
      [k("settings")]: {},
      "unrelated:daily:2026-08-17": {},
    });
    expect(await countSavedDays(adapter)).toBe(3);
  });
});

describe("reminder state", () => {
  it("defaults to empty, so a fresh browser is offered a backup", async () => {
    expect(await loadReminderState(fakeAdapter())).toEqual({});
  });

  it("clears a snooze when a backup is actually saved", async () => {
    const adapter = fakeAdapter();
    await snoozeReminder(NOW, adapter);
    await recordBackupSaved(NOW, adapter);
    const state = await loadReminderState(adapter);
    expect(state.snoozedAt).toBeUndefined();
    expect(state.lastSavedAt).toBe(NOW.toISOString());
  });

  it("round-trips a snooze", async () => {
    const adapter = fakeAdapter();
    await snoozeReminder(NOW, adapter);
    expect((await loadReminderState(adapter)).snoozedAt).toBe(
      NOW.toISOString(),
    );
  });
});

describe("the state key stays out of the player-facing counts", () => {
  it("is not reported as a sixth game", () => {
    // The key deliberately has no leaf segment. If that ever changes,
    // summarizeBackup would count "backup" as a game and the restore
    // dialog would lie about what the file holds.
    const backup: Backup = {
      app: "wordgirl",
      format: 1,
      exportedAt: "",
      data: {
        [k("polygram:daily:2026-08-17")]: {},
        [k("backup")]: { lastSavedAt: NOW.toISOString() },
      },
    };
    expect(summarizeBackup(backup)).toMatchObject({ days: 1, games: 1 });
  });
});
