import { createLocalStorageAdapter } from "./storage/localStorageAdapter";
import type { StorageAdapter } from "./storage/types";
import { BACKUP_PREFIX } from "./backup";

/**
 * When to suggest saving a backup.
 *
 * The players with the most to lose are the ones least likely to think of
 * it: a long streak is exactly the state where "my browser forgot" hurts,
 * and exactly the state where nobody is browsing Settings. So the app
 * raises it — once it is worth raising, and rarely.
 *
 * The whole policy is a pure function so the thresholds can be argued
 * with in a test rather than by waiting three weeks to see what happens.
 */

/** Below this there is little to lose, and the offer is just noise. */
export const REMINDER_MIN_DAYS = 7;
/** A backup older than this no longer covers most of a streak. */
export const REMINDER_STALE_DAYS = 30;
/** After "Not now", stay quiet this long. */
export const REMINDER_SNOOZE_DAYS = 14;

/**
 * Stored at a key with NO leaf segment (`wg:v1:local:backup`), which
 * keeps it out of summarizeBackup's game count — that reads the segment
 * after the profile id, so `backup:lastSavedAt` would have been reported
 * to players as a sixth game.
 */
const STATE_KEY = `${BACKUP_PREFIX}backup`;

export interface ReminderState {
  /** ISO timestamp of the last backup saved from this browser. */
  lastSavedAt?: string;
  /** ISO timestamp of the last "Not now". */
  snoozedAt?: string;
}

const defaultAdapter = createLocalStorageAdapter();

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(fromIso: string | undefined, now: Date): number | null {
  if (!fromIso) return null;
  const then = Date.parse(fromIso);
  if (Number.isNaN(then)) return null;
  return (now.getTime() - then) / DAY_MS;
}

/**
 * Should the hub offer a backup right now?
 *
 * Deliberately silent when there is nothing to protect, when a recent
 * backup already covers it, and for a fortnight after being waved off.
 * An unsaveable browser is not asked either — offering a backup to a
 * player whose storage is broken is a cruel joke.
 */
export function shouldOfferBackup({
  savedDays,
  state,
  now = new Date(),
}: {
  savedDays: number;
  state: ReminderState;
  now?: Date;
}): boolean {
  if (savedDays < REMINDER_MIN_DAYS) return false;

  const sinceSnooze = daysBetween(state.snoozedAt, now);
  if (sinceSnooze !== null && sinceSnooze < REMINDER_SNOOZE_DAYS) return false;

  const sinceSave = daysBetween(state.lastSavedAt, now);
  if (sinceSave !== null && sinceSave < REMINDER_STALE_DAYS) return false;

  return true;
}

/** How many day saves exist across every game. */
export async function countSavedDays(
  adapter: StorageAdapter = defaultAdapter,
): Promise<number> {
  const keys = await adapter.keys(BACKUP_PREFIX);
  return keys.filter((k) => k.includes(":daily:")).length;
}

export async function loadReminderState(
  adapter: StorageAdapter = defaultAdapter,
): Promise<ReminderState> {
  return (await adapter.get<ReminderState>(STATE_KEY)) ?? {};
}

/**
 * Record a save. Clears any snooze: the player has now done the thing the
 * snooze was deferring, so the next prompt should be timed from the save.
 */
export async function recordBackupSaved(
  now: Date = new Date(),
  adapter: StorageAdapter = defaultAdapter,
): Promise<void> {
  await adapter.set(STATE_KEY, { lastSavedAt: now.toISOString() });
}

export async function snoozeReminder(
  now: Date = new Date(),
  adapter: StorageAdapter = defaultAdapter,
): Promise<void> {
  const state = await loadReminderState(adapter);
  await adapter.set(STATE_KEY, { ...state, snoozedAt: now.toISOString() });
}
