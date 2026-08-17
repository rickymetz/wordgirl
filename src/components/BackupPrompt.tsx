import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { backupFilename, createBackup } from "../lib/backup";
import { downloadJson } from "../lib/backupFile";
import {
  countSavedDays,
  loadReminderState,
  recordBackupSaved,
  shouldOfferBackup,
  snoozeReminder,
} from "../lib/backupReminder";
import { trackBackupExport, trackBackupReminder } from "../lib/analytics";

/**
 * The hub's occasional nudge to save a backup.
 *
 * An inline card, NOT a modal — unlike the tutorial offer, which earns
 * its dialog by being a one-time question asked at the moment a player
 * first meets a game. This one recurs, and a recurring dialog in front of
 * someone who opened the app to play is nagging. It sits at the foot of
 * the hub where it can be read or ignored, and saying "Not now" buys a
 * fortnight of silence.
 *
 * It renders nothing at all until storage has been read, so a player who
 * does not need it never sees a flash of it.
 */
export function BackupPrompt() {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(0);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [savedDays, state] = await Promise.all([
        countSavedDays(),
        loadReminderState(),
      ]);
      if (!live || !shouldOfferBackup({ savedDays, state })) return;
      setDays(savedDays);
      setOpen(true);
      // Counted where it is SHOWN, so it can be the denominator for the
      // export event — the same reasoning as `tutorial-offered`.
      trackBackupReminder();
      // Staying silent is the right failure: a browser that cannot be
      // read cannot be backed up either, and an error card on the hub
      // would be noise about a feature the player never asked for.
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!open) return null;

  // Mirrors BackupRows: a failed save has to SAY so. Without the catch a
  // rejection from `void save()` is an unhandled rejection and the tap
  // looks like a dead button, which is the worst way to learn your
  // backup did not happen.
  const save = async () => {
    try {
      const backup = await createBackup();
      downloadJson(backup, backupFilename());
      await recordBackupSaved();
      trackBackupExport();
      setSaved(true);
    } catch {
      setFailed(true);
    }
  };

  const dismiss = async () => {
    setOpen(false);
    // A snooze that fails to persist only costs one extra prompt later.
    try {
      await snoozeReminder();
    } catch {
      /* ignored */
    }
  };

  return (
    <section
      aria-labelledby="backup-prompt-title"
      className="mt-8 rounded-3xl border border-line bg-surface-tint p-5"
    >
      <h2
        id="backup-prompt-title"
        className="flex items-center gap-2 font-semibold"
      >
        <ShieldCheck aria-hidden className="h-4.5 w-4.5 text-ink-soft" />
        {saved ? "Backup saved" : "Keep your streak safe"}
      </h2>
      <p className="pt-2 text-sm leading-relaxed text-ink-soft">
        {saved ? (
          <>
            Keep the file somewhere that isn't this device. You can restore
            it any time from Settings.
          </>
        ) : (
          <>
            You have {days} saved {days === 1 ? "day" : "days"}, and they
            live only in this browser — clearing its data would take them.
            A backup file keeps them safe and moves them to a new phone.
          </>
        )}
      </p>
      {failed && (
        <p role="status" className="pt-2 text-sm font-medium text-ink">
          Couldn't save the backup. You can try again from Settings.
        </p>
      )}
      {/* py-3, not py-2.5: at this font size 2.5 measures 40px, under the
          44px touch floor. Measured against the real build, not guessed. */}
      {!saved && (
        <div className="flex gap-2.5 pt-4">
          <button
            type="button"
            onClick={() => void dismiss()}
            className="flex-1 rounded-full bg-surface py-3 text-sm font-semibold text-ink-soft active:scale-95"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => void save()}
            className="flex-1 rounded-full bg-accent py-3 text-sm font-semibold text-surface active:scale-95"
          >
            Save a backup
          </button>
        </div>
      )}
    </section>
  );
}
