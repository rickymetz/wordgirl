/**
 * App-level display settings: theme override, text size, and typeface.
 * All three are applied by mutating the <html> element — the CSS is built
 * entirely from light-dark() pairs, so forcing a theme is just a
 * color-scheme flip (html[data-theme] in index.css); Tailwind sizes are
 * rem-based, so text scales from the root font-size; and the two font
 * tokens are custom properties, so swapping the typeface is one
 * html[data-font] override.
 */

export type ThemePref = "system" | "light" | "dark";

/** `accessible` swaps both house faces for Lexend. See index.css. */
export type FontPref = "default" | "accessible";

export interface Settings {
  theme: ThemePref;
  /** Root font-size percentage; 100 = browser default. */
  fontScale: number;
  font: FontPref;
}

/**
 * MIRRORED by index.html's inline boot script as the literal non-100
 * value list (100 means "no override", matching applySettings below).
 * Change a rung here and the boot mirror must follow —
 * bootMirror.test.ts fails the build until it does.
 */
export const FONT_SCALES = [
  { value: 87.5, label: "Small" },
  { value: 100, label: "Default" },
  { value: 112.5, label: "Large" },
  { value: 125, label: "Huge" },
] as const;

export const FONTS: { value: FontPref; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "accessible", label: "Accessible" },
];

const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  fontScale: 100,
  font: "default",
};

/** MIRRORED by index.html's inline boot script (bootMirror.test.ts). */
export const SETTINGS_KEY = "wg:v1:local:settings";

// A three-way mirror: --color-surface in index.css, and the theme-color
// rewrite in index.html's inline boot script (bootMirror.test.ts). The
// installed PWA's browser chrome follows these metas.
export const SURFACE = { light: "#ffffff", dark: "#121116" };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      theme: ["system", "light", "dark"].includes(parsed.theme as string)
        ? (parsed.theme as ThemePref)
        : DEFAULT_SETTINGS.theme,
      fontScale: FONT_SCALES.some((f) => f.value === parsed.fontScale)
        ? (parsed.fontScale as number)
        : DEFAULT_SETTINGS.fontScale,
      // Saves predate this setting, so a missing value is the norm, not
      // corruption — it falls to Default like any unrecognised one.
      font: FONTS.some((f) => f.value === parsed.font)
        ? (parsed.font as FontPref)
        : DEFAULT_SETTINGS.font,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
  if (settings.font === "default") {
    delete root.dataset.font;
  } else {
    root.dataset.font = settings.font;
  }

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
