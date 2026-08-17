import { useState } from "react";
import type { ReactNode } from "react";
import { Monitor, Moon, RefreshCw, Sun, X } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { BackupRows } from "./BackupRows";
import {
  FONT_SCALES,
  FONTS,
  loadSettings,
  saveSettings,
  type Settings,
  type ThemePref,
} from "../lib/settings";
import { checkForUpdates } from "../lib/swUpdate";
import { trackSetting } from "../lib/analytics";

const THEMES: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

/**
 * Report a setting the player just changed.
 *
 * Compares before against after rather than reading the patch, so a tap
 * that re-selects the value already showing reports nothing — the radios
 * are always tappable, and a no-op is not a decision. Text size goes out
 * as its LABEL: `setting:text:huge` reads on a dashboard where
 * `setting:text:112.5` does not.
 */
function reportChange(before: Settings, after: Settings) {
  if (before.theme !== after.theme) {
    trackSetting({ key: "theme", value: after.theme });
  }
  if (before.fontScale !== after.fontScale) {
    const label = FONT_SCALES.find((f) => f.value === after.fontScale)?.label;
    if (label) {
      trackSetting({
        key: "text",
        value: label.toLowerCase() as "small" | "default" | "large" | "huge",
      });
    }
  }
  if (before.font !== after.font) {
    trackSetting({ key: "font", value: after.font });
  }
}

/**
 * Display settings + app utilities, as a bottom sheet — thumb-reach on
 * a phone, where this app lives. Changes apply live; the sheet closes
 * by X, backdrop tap, or Escape. Mount inside <AnimatePresence> so the
 * slide-out plays.
 */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    reportChange(settings, next);
  };

  return (
    <BottomSheet labelledBy="settings-title" onClose={onClose}>
      <div data-level="neutral">
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
              content: (
                <span aria-hidden style={{ fontSize: `${f.value / 100}em` }}>
                  Aa
                </span>
              ),
            }))}
            value={settings.fontScale}
            onChange={(fontScale) => update({ fontScale })}
          />
          <Segmented
            label="Font"
            options={FONTS.map(({ value, label }) => ({
              value,
              label,
              // Each option is set in the face it selects, so the choice
              // shows what it does before it is made.
              content: (
                <span
                  style={{
                    fontFamily:
                      value === "accessible"
                        ? "var(--font-access)"
                        : "var(--font-display-house)",
                  }}
                >
                  {label}
                </span>
              ),
            }))}
            value={settings.font}
            onChange={(font) => update({ font })}
          />
          <BackupRows />
          <UpdateRow />
        </div>
      </div>
    </BottomSheet>
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
  // The radio keyboard pattern: one tab stop per group (the checked
  // option), arrows move AND select. Selection focuses the new option.
  const selected = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const move = (e: React.KeyboardEvent, delta: number) => {
    e.preventDefault();
    const next = options[(selected + delta + options.length) % options.length];
    onChange(next.value);
    const group = e.currentTarget.closest('[role="radiogroup"]');
    (
      group?.querySelectorAll<HTMLElement>('[role="radio"]') ?? []
    )[(selected + delta + options.length) % options.length]?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") move(e, 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") move(e, -1);
  };
  return (
    <div>
      <div className="pb-2 text-sm font-semibold text-ink-soft">{label}</div>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex gap-1.5 rounded-full bg-tile p-1"
      >
        {options.map((option, i) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            aria-label={option.label}
            tabIndex={i === selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={onKeyDown}
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
