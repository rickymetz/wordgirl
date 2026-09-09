/**
 * Pins index.html's inline boot mirrors to their sources of truth.
 *
 * The boot screen must render before (or without) the app bundle and
 * stylesheet, so index.html carries literal copies of values that live
 * in src/lib/settings.ts and src/index.css. cspHashGuard makes HASH
 * drift a build failure; this test does the same for VALUE drift — the
 * kind that actually breaks the player's screen (a new Text-size rung
 * the boot ignores, a retuned surface color the skeleton no longer
 * matches). Same pattern as legal/claims.test.ts: read the files off
 * disk, compare, and fail naming the copy to update.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FONT_SCALES, SETTINGS_KEY, SURFACE } from "./settings";

const root = join(import.meta.dirname, "..", "..");
const indexHtml = readFileSync(join(root, "index.html"), "utf8");
const indexCss = readFileSync(join(root, "src", "index.css"), "utf8");

const inlineScript = /<script>([\s\S]*?)<\/script>/.exec(indexHtml)?.[1] ?? "";
const inlineStyle = /<style>([\s\S]*?)<\/style>/.exec(indexHtml)?.[1] ?? "";

/** The light-dark(...) pair declared for a token, whitespace-normalized. */
function lightDarkPair(css: string, token: string): string {
  const m = new RegExp(`${token}:\\s*light-dark\\(([\\s\\S]*?)\\);`).exec(css);
  expect(m, `${token} not found`).toBeTruthy();
  return m![1].replace(/\s+/g, " ").trim();
}

describe("inline boot script mirrors settings.ts", () => {
  it("reads the same storage key", () => {
    expect(
      inlineScript,
      "index.html's boot script must read SETTINGS_KEY (src/lib/settings.ts)",
    ).toContain(`localStorage.getItem("${SETTINGS_KEY}")`);
  });

  it("allowlists exactly the non-default FONT_SCALES", () => {
    const m = /\[([\d., ]+)\]\.indexOf\(s\.fontScale\)/.exec(inlineScript);
    expect(m, "boot script's fontScale allowlist not found").toBeTruthy();
    const inline = m![1].split(",").map((v) => Number(v.trim()));
    const source = FONT_SCALES.map((f) => f.value).filter((v) => v !== 100);
    // 100 means "no override" (applySettings clears the inline style),
    // so the boot mirror is FONT_SCALES minus 100, not a verbatim copy.
    expect(
      inline,
      "update index.html's boot script when FONT_SCALES changes",
    ).toEqual(source);
  });

  it("rewrites theme-color metas with the SURFACE pair", () => {
    expect(inlineScript).toContain(`"${SURFACE.dark}"`);
    expect(inlineScript).toContain(`"${SURFACE.light}"`);
  });
});

describe("inline boot style mirrors index.css", () => {
  const mirrors: [boot: string, app: string][] = [
    ["--boot-surface", "--color-surface"],
    ["--boot-raised", "--color-surface-raised"],
    ["--boot-ink", "--color-ink"],
    ["--boot-ink-soft", "--color-ink-soft"],
    ["--boot-line", "--color-line"],
    ["--boot-accent", "--color-accent"],
  ];
  it.each(mirrors)("%s matches %s", (boot, app) => {
    expect(
      lightDarkPair(inlineStyle, boot),
      `index.html's ${boot} must equal index.css's ${app}`,
    ).toBe(lightDarkPair(indexCss, app));
  });

  it("--boot-tint bakes the surface-tint mix at the root accent", () => {
    const tint = lightDarkPair(inlineStyle, "--boot-tint");
    const appTint = lightDarkPair(indexCss, "--color-surface-tint");
    const [accentLight, accentDark] = lightDarkPair(indexCss, "--color-accent")
      .split(",")
      .map((s) => s.trim());
    const [raisedLight, raisedDark] = lightDarkPair(
      indexCss,
      "--color-surface-raised",
    )
      .split(",")
      .map((s) => s.trim());
    // index.css mixes via var(); the boot copy must bake the SAME
    // percentages against the SAME accent and raised literals.
    for (const pct of appTint.match(/\d+%/g) ?? []) {
      expect(tint, `tint mix must keep index.css's ${pct}`).toContain(pct);
    }
    expect(tint).toContain(`${accentLight} 6%, ${raisedLight}`);
    expect(tint).toContain(`${accentDark} 13%, ${raisedDark}`);
  });

  it("SURFACE (settings.ts) is --color-surface", () => {
    expect(lightDarkPair(indexCss, "--color-surface")).toBe(
      `${SURFACE.light}, ${SURFACE.dark}`,
    );
  });

  it("boot font fallback list is --font-display-house", () => {
    const house = /--font-display-house:\s*([^;]+);/.exec(indexCss)?.[1].trim();
    expect(house).toBeTruthy();
    const boot = /font-family:\s*var\(\s*--font-display,([\s\S]*?)\);/
      .exec(inlineStyle)?.[1]
      .replace(/\s+/g, " ")
      .trim();
    expect(
      boot,
      "index.html's #boot-fallback fallback list must equal --font-display-house",
    ).toBe(house);
  });

  it("theme hooks and the md font step match", () => {
    for (const rule of [
      'html[data-theme="light"] { color-scheme: light; }',
      'html[data-theme="dark"] { color-scheme: dark; }',
    ]) {
      expect(inlineStyle.replace(/\s+/g, " ")).toContain(rule);
      expect(indexCss.replace(/\s+/g, " ")).toContain(rule);
    }
    const appStep = /min-width: 768px\) \{ font-size: (\d+)px/.exec(
      indexCss,
    )?.[1];
    expect(appStep).toBeTruthy();
    expect(inlineStyle.replace(/\s+/g, " ")).toContain(
      `(min-width: 768px) { html { font-size: ${appStep}px; }`,
    );
  });
});
