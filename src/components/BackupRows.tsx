import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { ModalDialog } from "./ModalDialog";
import {
  backupFilename,
  createBackup,
  parseBackup,
  restoreBackup,
  summarizeBackup,
  type Backup,
} from "../lib/backup";
import { downloadJson, readFileText } from "../lib/backupFile";
import { recordBackupSaved } from "../lib/backupReminder";
import { trackBackupExport, trackBackupRestore } from "../lib/analytics";

/**
 * The Progress section of the settings sheet: save a backup file, or
 * restore one.
 *
 * Restoring REPLACES everything and then reloads the page, which is the
 * only honest way to do it — a dozen hooks are already holding hydrated
 * state, and rewriting storage underneath them would leave the screen
 * showing yesterday's progress until something happened to re-read it.
 * The reload is stated on the confirm button rather than sprung.
 */
export function BackupRows() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const backup = await createBackup();
      downloadJson(backup, backupFilename());
      // Recorded so the hub's reminder respects a save made here and
      // stays quiet, rather than asking again the next time you visit.
      await recordBackupSaved();
      trackBackupExport();
      setStatus("Backup saved");
    } catch {
      setStatus("Couldn't save the backup");
    } finally {
      setBusy(false);
    }
  };

  const pick = async (file: File | undefined) => {
    // Always clear the input: picking the SAME file twice must fire
    // change again, and it will not if the value is still set.
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setStatus(null);
    let text: string;
    try {
      text = await readFileText(file);
    } catch {
      setStatus("Couldn't read that file");
      return;
    }
    const result = parseBackup(text);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setPending(result.backup);
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    await restoreBackup(pending);
    trackBackupRestore();
    // Full reload rather than a state reset: every game hook hydrates
    // once on mount, and the theme and font settings are applied to
    // <html> at boot.
    window.location.reload();
  };

  return (
    <div>
      <div className="pb-2 text-sm font-semibold text-ink-soft">Progress</div>
      <div className="flex flex-col gap-1.5">
        <Row Icon={Download} label="Save a backup" onClick={save} busy={busy} />
        <Row
          Icon={Upload}
          label="Restore a backup"
          onClick={() => fileRef.current?.click()}
          busy={busy}
        />
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        <p className="px-1 pt-1 text-xs leading-snug text-ink-soft">
          Your streaks and stats live only in this browser. A backup file
          moves them to another device — or brings them back if this one
          forgets.
        </p>
        {status && (
          <p role="status" className="px-1 text-xs font-medium text-ink">
            {status}
          </p>
        )}
      </div>
      <AnimatePresence>
        {pending && (
          <ConfirmRestore
            backup={pending}
            busy={busy}
            onCancel={() => setPending(null)}
            onConfirm={confirm}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({
  Icon,
  label,
  onClick,
  busy,
}: {
  Icon: typeof Download;
  label: string;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center gap-2.5 rounded-2xl bg-tile px-4 py-3 text-left text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
    >
      <Icon aria-hidden className="h-4 w-4 text-ink-soft" />
      {label}
    </button>
  );
}

/**
 * Restoring is destructive and cannot be undone, so it gets the house
 * confirmation dialog rather than a HoldButton: the mistake is a lost
 * history, which is far heavier than a modal.
 */
function ConfirmRestore({
  backup,
  busy,
  onCancel,
  onConfirm,
}: {
  backup: Backup;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { days, games } = summarizeBackup(backup);
  return (
    <ModalDialog labelledBy="restore-title" onClose={busy ? undefined : onCancel}>
      <h2 id="restore-title" className="text-lg font-bold">
        Restore this backup?
      </h2>
      <p className="pt-2 text-sm leading-relaxed text-ink-soft">
        It holds {days} saved {days === 1 ? "day" : "days"} across {games}{" "}
        {games === 1 ? "game" : "games"}.
      </p>
      <p className="pt-2 text-sm leading-relaxed text-ink-soft">
        This replaces the progress in this browser — anything not in the
        backup is lost, including days played since it was made. Save a
        backup first if you are not sure.
      </p>
      {/* py-3 clears the 44px touch floor; py-2.5 measures 40. */}
      <div className="flex gap-2.5 pt-5">
        <button
          type="button"
          data-autofocus
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-full bg-tile py-3 text-sm font-semibold active:scale-95 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="flex-1 rounded-full bg-accent py-3 text-sm font-semibold text-surface active:scale-95 disabled:opacity-60"
        >
          Replace and reload
        </button>
      </div>
    </ModalDialog>
  );
}
