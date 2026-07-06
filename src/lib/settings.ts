/**
 * App-level display settings: theme override and text size. Applied by
 * mutating the <html> element — the CSS is built entirely from
 * light-dark() pairs, so forcing a theme is just a color-scheme flip
 * (html[data-theme] in index.css), and Tailwind sizes are rem-based, so
 * text scales from the root font-size.
 */

export type ThemePref = "system" | "light" | "dark";

export interface Settings {
  theme: ThemePref;
  /** Root font-size percentage; 100 = browser default. */
  fontScale: number;
}

export const FONT_SCALES = [
  { value: 87.5, label: "Small" },
  { value: 100, label: "Default" },
  { value: 112.5, label: "Large" },
  { value: 125, label: "Huge" },
] as const;

export const DEFAULT_SETTINGS: Settings = { theme: "system", fontScale: 100 };

const KEY = "wg:v1:local:settings";

// Keep in sync with --color-surface in index.css; the installed PWA's
// browser chrome follows these metas.
const SURFACE = { light: "#ffffff", dark: "#121116" };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      theme: ["system", "light", "dark"].includes(parsed.theme as string)
        ? (parsed.theme as ThemePref)
        : DEFAULT_SETTINGS.theme,
      fontScale: FONT_SCALES.some((f) => f.value === parsed.fontScale)
        ? (parsed.fontScale as number)
        : DEFAULT_SETTINGS.fontScale,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable — the setting still applies for this session.
  }
  applySettings(settings);
}

export function applySettings(settings: Settings): void {
  const root = document.documentElement;
  if (settings.theme === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = settings.theme;
  }
  root.style.fontSize =
    settings.fontScale === 100 ? "" : `${settings.fontScale}%`;

  // theme-color metas carry media queries for the SYSTEM scheme; when a
  // theme is forced, both must show the forced surface color.
  for (const meta of document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  )) {
    if (settings.theme === "system") {
      meta.content = meta.media.includes("dark")
        ? SURFACE.dark
        : SURFACE.light;
    } else {
      meta.content = SURFACE[settings.theme];
    }
  }
}
