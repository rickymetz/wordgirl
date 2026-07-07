import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Monitor, Moon, RefreshCw, Sun, X } from "lucide-react";
import { useModalFocus } from "./useModalFocus";
import {
  FONT_SCALES,
  loadSettings,
  saveSettings,
  type Settings,
  type ThemePref,
} from "../lib/settings";
import { checkForUpdates } from "../lib/swUpdate";

const THEMES: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

/**
 * Display settings + app utilities, as a bottom sheet — thumb-reach on
 * a phone, where this app lives. Changes apply live; the sheet closes
 * by X, backdrop tap, or Escape. Mount inside <AnimatePresence> so the
 * slide-out plays.
 */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const ref = useModalFocus<HTMLDivElement>(true);
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
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <motion.div
        className="absolute inset-0 bg-surface/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 400 }}
        className="relative w-full max-w-md rounded-t-3xl border-t border-line bg-surface-raised px-6 pt-3 shadow-xl outline-none"
        // The sheet is fixed to the real viewport bottom, outside
        // #root's safe-area padding — it carries its own.
        style={{ paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))" }}
      >
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <div className="flex items-center justify-between pb-4">
          <h2 id="settings-title" className="text-lg font-bold">
            Settings
          </h2>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="close settings"
            className="-m-2 flex h-9 w-9 items-center justify-center rounded-full p-2 text-ink-soft active:scale-90"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <Segmented
            label="Theme"
            options={THEMES.map(({ value, label, Icon }) => ({
              value,
              label,
              content: (
                <span className="flex items-center gap-1.5">
                  <Icon aria-hidden className="h-4 w-4" />
                  {label}
                </span>
              ),
            }))}
            value={settings.theme}
            onChange={(theme) => update({ theme })}
          />
          <Segmented
            label="Text size"
            options={FONT_SCALES.map((f) => ({
              value: f.value,
              label: f.label,
              // Graduated "Aa" — the option previews its own size.
              content: (
                <span aria-hidden style={{ fontSize: `${f.value / 100}em` }}>
                  Aa
                </span>
              ),
            }))}
            value={settings.fontScale}
            onChange={(fontScale) => update({ fontScale })}
          />
          <UpdateRow />
        </div>
      </motion.div>
    </div>
  );
}

const UPDATE_STATUS = {
  checking: "Checking…",
  updating: "Update found…", // autoUpdate refreshes the app by itself
  current: "Up to date",
  failed: "Couldn't check",
  unavailable: "Not available here",
} as const;

/** Installed PWAs only look for new builds on launch, so an app kept
 * alive in the switcher can lag a deploy — this row asks right now. */
function UpdateRow() {
  const [status, setStatus] = useState<keyof typeof UPDATE_STATUS | null>(
    null,
  );
  const check = async () => {
    setStatus("checking");
    setStatus(await checkForUpdates());
  };
  return (
    <button
      type="button"
      onClick={check}
      disabled={status === "checking"}
      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-tile px-4 py-3 text-left transition-transform active:scale-[0.98] disabled:opacity-60"
    >
      <span className="flex items-center gap-2.5 text-sm font-semibold">
        <RefreshCw
          aria-hidden
          className={`h-4 w-4 text-ink-soft ${
            status === "checking" ? "animate-spin" : ""
          }`}
        />
        Check for updates
      </span>
      {status && (
        <span role="status" className="text-xs font-medium text-ink-soft">
          {UPDATE_STATUS[status]}
        </span>
      )}
    </button>
  );
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string; content?: ReactNode }[];
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
            aria-label={option.label}
            onClick={() => onChange(option.value)}
            className={`flex h-9 flex-1 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
              option.value === value
                ? "bg-accent text-surface"
                : "text-ink-soft"
            }`}
          >
            {option.content ?? option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
