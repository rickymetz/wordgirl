#!/usr/bin/env node
/**
 * Validate accent palette for WCAG AA contrast and simulated CVD
 * distinguishability. Run: node scripts/validate_palette.js
 *
 * Checks:
 * 1. Each accent on white (#fff) and near-black (#1a1a2e) clears 4.5:1
 * 2. Accent-on-accent pairs stay distinguishable under simulated
 *    deuteranopia (the most common CVD).
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Extract light-dark hex pairs from index.css
const css = readFileSync(resolve(__dirname, "../src/index.css"), "utf8");

const accents = [];
const re =
  /\[data-level="([^"]+)"\]\s*\{[^}]*--color-accent:\s*(?:light-dark\(([^,]+),\s*([^)]+)\)|var\(--level-\d+\))/g;
const levelRe = /--level-(\d+):\s*light-dark\(([^,]+),\s*([^)]+)\)/g;

const levels = {};
for (const m of css.matchAll(levelRe)) {
  levels[m[1]] = { light: m[2].trim(), dark: m[3].trim() };
}

for (const m of css.matchAll(re)) {
  const name = m[1];
  if (m[2] && m[3]) {
    accents.push({ name, light: m[2].trim(), dark: m[3].trim() });
  }
}

// Also resolve var(--level-N) references
const varRef =
  /\[data-level="([^"]+)"\]\s*\{\s*--color-accent:\s*var\(--level-(\d+)\)/g;
for (const m of css.matchAll(varRef)) {
  const name = m[1];
  const lv = levels[m[2]];
  if (lv) accents.push({ name, ...lv });
}

function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  return [
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
  ];
}

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([r, g, b]) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Brettel deuteranopia simulation (simplified)
function simulateDeutan([r, g, b]) {
  return [
    0.625 * r + 0.375 * g,
    0.7 * g + 0.3 * r,
    0.3 * g + 0.7 * b,
  ];
}

function colorDistance(c1, c2) {
  return Math.sqrt(
    (c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2,
  );
}

let failures = 0;

console.log("=== WCAG AA Contrast Check (4.5:1 minimum) ===\n");

const surfaces = { "white (#fff)": "#ffffff", "dark (#1a1a2e)": "#1a1a2e" };

for (const accent of accents) {
  const pairs = [
    { theme: "light", hex: accent.light, surface: "#ffffff", surfaceName: "white" },
    { theme: "dark", hex: accent.dark, surface: "#1a1a2e", surfaceName: "dark bg" },
  ];
  for (const p of pairs) {
    const ratio = contrastRatio(p.hex, p.surface);
    const pass = ratio >= 4.5;
    const mark = pass ? "PASS" : "FAIL";
    if (!pass) failures++;
    console.log(
      `  ${mark} ${accent.name} ${p.theme} (${p.hex}) on ${p.surfaceName}: ${ratio.toFixed(2)}:1`,
    );
  }
}

console.log("\n=== CVD Distinguishability (deuteranopia simulation) ===");
console.log("  Level colors (3-10) are a CATEGORICAL set, not just rank colors:");
console.log("  every board letter wears the color of the level that introduced");
console.log("  it, so by the decagon all eight share one surface. They are");
console.log("  expected to PASS. Cross-game charts remain banned per CLAUDE.md.\n");

const MIN_DISTANCE = 0.08;

for (let i = 0; i < accents.length; i++) {
  for (let j = i + 1; j < accents.length; j++) {
    for (const theme of ["light", "dark"]) {
      const c1 = simulateDeutan(hexToRgb(accents[i][theme]));
      const c2 = simulateDeutan(hexToRgb(accents[j][theme]));
      const dist = colorDistance(c1, c2);
      const pass = dist >= MIN_DISTANCE;
      if (!pass) {
        failures++;
        console.log(
          `  FAIL ${theme}: ${accents[i].name} vs ${accents[j].name} — distance ${dist.toFixed(4)} < ${MIN_DISTANCE}`,
        );
      }
    }
  }
}

if (failures === 0) {
  console.log("  All accent pairs are distinguishable under simulated deuteranopia.\n");
}

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} failure(s) found.`}`);
process.exit(failures > 0 ? 1 : 0);
