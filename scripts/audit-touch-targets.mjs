/**
 * Touch-target audit: every interactive element on every screen, measured
 * against the 44px floor in CLAUDE.md.
 *
 *   npm run build && npx vite preview --port 4173
 *   node scripts/audit-touch-targets.mjs
 *
 * It HIT-TESTS rather than measuring boxes. The house rule allows an
 * invisible `::after` or negative-margin padding to carry the target, and
 * both are invisible to getBoundingClientRect — while an `::after` that
 * looks right can still be clipped by a scrolling ancestor, which a box
 * measurement would happily call a pass. elementFromPoint returns the
 * originating element for a pseudo, so this measures what a thumb finds.
 *
 * Two exclusions, both deliberate:
 *   - anything that does not own its own centre is behind a backdrop or
 *     otherwise inert, which is not a sizing problem;
 *   - Crosshatch's on-screen keyboard keys are ~30px wide and stay that
 *     way. Ten keys per row cannot each be 44px on a 390px screen (that
 *     needs 440px), and width binds absolutely. iOS's own keys are ~32px.
 *     They are reported; they are not a bug.
 */

import { chromium } from "/home/user/wordgirl/node_modules/playwright-core/index.mjs";

// Port is overridable so the audit can point at whatever preview is up:
//   node scripts/audit-touch-targets.mjs http://localhost:4174
const BASE = process.argv[2] || process.env.AUDIT_BASE || "http://localhost:4173";
const MIN = 44;

// Hit-test rather than measure the box: the house allows an invisible
// ::after or negative-margin padding to carry the target, and both are
// invisible to a bounding box. elementFromPoint returns the originating
// element for a pseudo, so this measures what a thumb actually finds.
const PROBE = `(() => {
  const MIN = 44;
  const sel = 'button, a[href], [role="button"], [role="radio"], [role="tab"], input:not([type="hidden"]), summary, [tabindex]:not([tabindex="-1"])';
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') continue;
    if (r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) continue;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const owns = (x, y) => {
      const hit = document.elementFromPoint(x, y);
      return !!hit && (hit === el || el.contains(hit) || hit.contains(el));
    };
    // If it does not own its own centre it is behind a backdrop or
    // otherwise inert — not a sizing problem, so not a finding.
    if (!owns(cx, cy)) continue;
    const half = MIN / 2 - 1;
    const vOK = owns(cx, cy - half) && owns(cx, cy + half);
    const hOK = owns(cx - half, cy) && owns(cx + half, cy);
    if (vOK && hOK) continue;
    out.push({
      tag: el.tagName.toLowerCase(),
      label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
      w: Math.round(r.width), h: Math.round(r.height),
      vOK, hOK,
      cls: (el.getAttribute('class') || '').slice(0, 90),
    });
  }
  return out;
})()`;

const SCREENS = [
  { name: "hub", path: "/" },
  { name: "hub+settings", path: "/", act: async (p) => { await p.locator('button[aria-label="settings"]').click(); await p.waitForTimeout(500); } },
  { name: "dictionary", path: "/dictionary" },
  { name: "privacy", path: "/privacy" },
  { name: "terms", path: "/terms" },
];
for (const g of ["polygram", "crosshatch", "pierglass", "doublet", "serpentine"]) {
  SCREENS.push({ name: `${g}`, path: `/games/${g}` });
  SCREENS.push({ name: `${g}+coach`, path: `/games/${g}`, act: async (p) => {
    const b = p.locator('button[aria-label*="how to play" i], button[aria-label*="help" i]').first();
    if (await b.count()) { await b.click(); await p.waitForTimeout(500); }
  }});
  SCREENS.push({ name: `${g}/tutorial`, path: `/games/${g}/tutorial` });
  SCREENS.push({ name: `${g}/archive`, path: `/games/${g}/archive` });
  SCREENS.push({ name: `${g}/stats`, path: `/games/${g}/stats` });
}

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const findings = new Map();
const skipped = [];
for (const s of SCREENS) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + s.path, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(500);
    // Dismiss any first-visit tutorial offer so the screen underneath is reachable.
    const skip = page.getByRole("button", { name: "Skip" });
    if (await skip.count()) { await skip.click(); await page.waitForTimeout(300); }
    if (s.act) await s.act(page);
    const rows = await page.evaluate(PROBE);
    for (const r of rows) {
      const key = `${r.tag}|${r.label}|${r.cls}`;
      if (!findings.has(key)) findings.set(key, { ...r, screens: [] });
      findings.get(key).screens.push(s.name);
    }
  } catch (e) {
    skipped.push(`${s.name}: ${String(e).split("\n")[0].slice(0, 80)}`);
  }
  await ctx.close();
}
await b.close();

const all = [...findings.values()];

// Split the two failure kinds. UNDERSIZED is the actionable one: the box
// itself is short of 44 on the failing axis. OBSTRUCTED means the element
// is big enough but something sits over the probe point — usually a
// neighbour's expanded ::after overlapping it, which is worth a look but
// is not the drift this script hunts.
// Crosshatch's on-screen keyboard: ten keys per row cannot each be 44px
// on a 390px screen, so width binds and these stay ~30px. Excluded by
// name rather than by a size threshold, so a NEW narrow control still
// trips the audit.
const KEYBOARD = /^[a-z]$/;
const isKeyboardKey = (r) => r.tag === "button" && KEYBOARD.test(r.label);

const undersized = all.filter(
  (r) =>
    !isKeyboardKey(r) &&
    ((!r.vOK && r.h < MIN) || (!r.hOK && r.w < MIN)),
);
const keyboard = all.filter(isKeyboardKey);
const obstructed = all.filter(
  (r) => !undersized.includes(r) && !isKeyboardKey(r),
);

const show = (rows, title) => {
  console.log(`\n=== ${rows.length} ${title} ===\n`);
  for (const r of rows.sort((a, b) => a.h - b.h || a.w - b.w)) {
    const axis = !r.vOK && !r.hOK ? "both" : !r.vOK ? "vertical" : "horizontal";
    console.log(`${String(r.w).padStart(4)}x${String(r.h).padEnd(4)} ${axis.padEnd(10)} <${r.tag}> "${r.label}"`);
    console.log(`               screens: ${[...new Set(r.screens)].join(", ")}`);
    console.log(`               class:   ${r.cls}`);
  }
};

if (skipped.length) {
  console.log(`\n=== ${skipped.length} SCREENS COULD NOT BE AUDITED ===\n`);
  for (const s of skipped) console.log(`  ${s}`);
  console.log(`\nA screen that never loaded was audited of nothing. Reporting`);
  console.log(`"0 undersized" for it would be a false green, so this exits 1.`);
  console.log(`Is the preview server up, and on the right port?`);
  process.exitCode = 1;
}

show(undersized, `UNDERSIZED (box under ${MIN}px) — fix these`);
console.log(`\n(${keyboard.length} Crosshatch keyboard keys excluded by design — see the header)`);
if (process.argv.includes("--all")) {
  show(obstructed, "OBSTRUCTED (big enough, something covers the probe point)");
} else {
  console.log(`\n(${obstructed.length} obstructed-but-large-enough elements hidden; pass --all to list them)`);
}
if (undersized.length > 0) process.exitCode = 1;
