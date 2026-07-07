import { useEffect, useState } from "react";
import {
  FONT_SCALES,
  loadSettings,
  saveSettings,
  type Settings,
  type ThemePref,
} from "../lib/settings";
import { checkForUpdates } from "../lib/swUpdate";

const THEMES: { value: ThemePref; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** Display settings: theme override + text size. Changes apply live. */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-surface/80 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-full max-w-sm rounded-3xl border border-line bg-surface-raised p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="settings-title" className="text-lg font-bold">
          Settings
        </h2>

        <div className="mt-5 flex flex-col gap-5">
          <Segmented
            label="Theme"
            options={THEMES}
            value={settings.theme}
            onChange={(theme) => update({ theme })}
          />
          <Segmented
            label="Text size"
            options={FONT_SCALES.map((f) => ({
              value: f.value,
              label: f.label,
            }))}
            value={settings.fontScale}
            onChange={(fontScale) => update({ fontScale })}
          />
          <UpdateChecker />
        </div>

        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-accent py-2.5 font-semibold text-surface active:scale-95"
        >
          Done
        </button>
      </div>
    </div>
  );
}

const UPDATE_MESSAGES = {
  checking: "Checking…",
  updating: "Update found — the app will refresh in a moment.",
  current: "You're up to date.",
  failed: "Couldn't check — is the connection down?",
  unavailable: "Updates aren't available here.",
} as const;

/** "Check for updates": installed PWAs only look for new builds on
 * launch, so a stale app that's kept alive can lag — this asks now. */
function UpdateChecker() {
  const [status, setStatus] = useState<keyof typeof UPDATE_MESSAGES | null>(
    null,
  );
  const check = async () => {
    setStatus("checking");
    setStatus(await checkForUpdates());
  };
  return (
    <div>
      <div className="pb-2 text-sm font-semibold text-ink-soft">App</div>
      <button
        type="button"
        onClick={check}
        disabled={status === "checking"}
        className="w-full rounded-full border border-line py-2 text-sm font-semibold active:scale-95 disabled:opacity-40"
      >
        Check for updates
      </button>
      {status && (
        <p role="status" className="pt-2 text-center text-xs text-ink-soft">
          {UPDATE_MESSAGES[status]}
        </p>
      )}
    </div>
  );
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <div className="pb-2 text-sm font-semibold text-ink-soft">{label}</div>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex gap-1.5 rounded-full bg-tile p-1"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-full py-1.5 text-sm font-semibold transition-colors ${
              option.value === value
                ? "bg-accent text-surface"
                : "text-ink-soft"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
