// Generates per-game social-share cards (1200x630) into public/og/<id>.png.
//
// These back the per-game <meta property="og:image"> tags emitted by the
// og-shells Vite plugin (see vite.config.ts). A shared link to
// /games/<id> then unfurls AS that game — its name, tagline, accent and a
// phone showing the real, current board — instead of the generic hub card.
//
// The phone screenshot is captured LIVE from the built app, so it always
// reflects production rather than a baked-in teaser that drifts out of
// date. This is a by-hand asset step (it needs a browser + a preview
// server), deliberately NOT part of `npm run build` which must run
// headless in CI. Run it against a fresh build:
//
//   npm run build && npm run build:og-cards
//
// Committed generator, committed output — same shape as build-dictionary.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { build as esbuild } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHROMIUM = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium";
const PORT = Number(process.env.OG_PORT || 4185);
const BASE = `http://localhost:${PORT}`;

// Dark-theme accent per game (from src/index.css [data-level=...]). The card
// is always dark, so it takes the dark-mode value of each light-dark() pair.
// Tap a game's Hint button `n` times to reveal CORRECT progress on the board
// — no knowledge of the day's solution needed. Each hint is gated by a
// "Use a hint?" confirm dialog. Used by the board-play games (serpentine,
// doublet, pierglass) where a hint fills the board itself.
async function useHints(page, n) {
  const hint = page.getByRole("button", { name: /^hint/i }).first();
  const confirm = page.getByRole("button", { name: /^use hint/i }).first();
  for (let i = 0; i < n; i++) {
    try {
      await hint.click({ timeout: 1500 });
    } catch {
      break; // hint button exhausted / disabled / gone — keep what we have
    }
    // Word games gate a hint behind a "Use a hint?" dialog; path/tile games
    // apply it immediately. Confirm only if the dialog actually appeared.
    await confirm.click({ timeout: 800 }).catch(() => {});
    await page.waitForTimeout(650); // let any dialog close + the board update
  }
}

// `prep(page)` leaves each game mid-play so the card reads as an active game
// rather than a blank start. Word-list games (polygram, crosshatch) show
// progress in the GRID, so they type on the board rather than using hints
// (whose reveals live in a panel that would cover the board).
const GAMES = [
  {
    id: "polygram", name: "Polygram", tagline: "Spell your way from triangle to decagon.", accent: "#f87171",
    prep: async (page) => { await page.keyboard.type("BOR", { delay: 140 }); }, // partial guess, unsubmitted
  },
  {
    id: "crosshatch", name: "Crosshatch", tagline: "Every way the words fit.", accent: "#3ddbd9",
    prep: async (page) => {
      // Fill part of the first across word by tapping its on-screen keys.
      for (const k of ["S", "O"]) await page.getByRole("button", { name: new RegExp(`^${k}$`) }).first().click().catch(() => {});
    },
  },
  {
    id: "pierglass", name: "Pierglass", tagline: "Every word, a reflection.", accent: "#e879f9",
    prep: (page) => useHints(page, 1), // a 2-row puzzle; 2 hints would solve it

  },
  {
    id: "doublet", name: "Doublet", tagline: "Place the tiles. Spell the words.", accent: "#fbbf24",
    prep: (page) => useHints(page, 2),
  },
  {
    id: "serpentine", name: "Serpentine", tagline: "One continuous line.", accent: "#a3e635",
    prep: traceSerpentine,
  },
];

// Today's real solution path, computed from the game's own engine so the
// trail follows the CORRECT answer. Populated once before capture; null if
// the engine could not be evaluated (then traceSerpentine falls back to a
// free trace). Shape: { path: [{row,col}...], rows, cols }.
let SERP_SOLUTION = null;

/** Run the serpentine engine in Node (via esbuild) to get the daily path. */
async function serpentineDailyPath(dateKey) {
  const entry = `export { getDailyPuzzle } from ${JSON.stringify(join(root, "src/games/serpentine/engine/dailySeed.ts"))};`;
  const res = await esbuild({
    stdin: { contents: entry, resolveDir: root, loader: "ts", sourcefile: "og-entry.ts" },
    bundle: true, format: "esm", platform: "node", target: "es2022", write: false, logLevel: "silent",
  });
  const url = "data:text/javascript;base64," + Buffer.from(res.outputFiles[0].text).toString("base64");
  const mod = await import(url);
  const p = mod.getDailyPuzzle("haiku", dateKey); // "haiku" is the screen's default difficulty
  return { path: p.path, rows: p.rows, cols: p.cols };
}

// Draw the real trail by TAPPING the solution's cells in order — Serpentine
// extends the line to whatever adjacent cell is tapped, so walking the actual
// path draws the correct answer part-way. Falls back to a free (non-crossing)
// boustrophedon if the solution couldn't be computed, so a card is never blank.
async function traceSerpentine(page) {
  const grid = page.getByRole("grid");
  await grid.waitFor({ timeout: 4000 }).catch(() => {});
  const geo = await page.evaluate(() => {
    const g = document.querySelector('[role="grid"]');
    if (!g) return null;
    const r = g.getBoundingClientRect();
    const vb = g.querySelector("svg")?.getAttribute("viewBox")?.split(/\s+/).map(Number);
    const circ = g.querySelector("circle"); // the start node
    if (!vb || !circ) return null;
    return {
      left: r.left, top: r.top, width: r.width, height: r.height,
      cols: vb[2], rows: vb[3],
      head: { col: Math.round(+circ.getAttribute("cx") - 0.5), row: Math.round(+circ.getAttribute("cy") - 0.5) },
    };
  });
  if (!geo) return;
  const { left, top, width, height, cols, rows, head } = geo;
  const center = (c) => ({ x: left + (c.col + 0.5) * (width / cols), y: top + (c.row + 0.5) * (height / rows) });

  // Use the real solution only if it matches the rendered board (same grid and
  // same start cell) — a mismatch means a stale date, so free-trace instead.
  const sol = SERP_SOLUTION;
  const matches = sol && sol.rows === rows && sol.cols === cols &&
    sol.path[0]?.row === head.row && sol.path[0]?.col === head.col;

  let cells;
  if (matches) {
    const k = Math.max(4, Math.min(13, sol.path.length - 3)); // partial, never solved
    cells = sol.path.slice(1, 1 + k);
  } else {
    cells = [];
    const cur = { ...head };
    let hdir = head.col < cols / 2 ? 1 : -1;
    const vdir = head.row < rows / 2 ? 1 : -1;
    while (cells.length < 8) {
      if (cur.col + hdir >= 0 && cur.col + hdir < cols) cur.col += hdir;
      else if (cur.row + vdir >= 0 && cur.row + vdir < rows) { cur.row += vdir; hdir = -hdir; }
      else break;
      cells.push({ ...cur });
    }
  }
  for (const c of cells) {
    const { x, y } = center(c);
    await page.mouse.click(x, y);
    await page.waitForTimeout(110);
  }
}

// Rubik Mono One (the WordGirl wordmark face), embedded so the card renders
// with no network — the build's hashed copy under dist/assets.
function findFont() {
  const dir = join(root, "dist/assets");
  const hit = readdirSync(dir).find((f) => /^rubik-mono-one/.test(f) && f.endsWith(".woff2"));
  if (!hit) throw new Error("Rubik Mono One woff2 not found in dist/assets — run `npm run build` first.");
  return readFileSync(join(dir, hit)).toString("base64");
}

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`preview server never became ready at ${url}`);
}

// A clean edge-to-edge phone: dark bezel, rounded screen, the live shot.
// No notch drawn over the screen — the shot already carries the app's own
// header, and a notch would cover it.
function cardHtml({ name, tagline, accent, shotB64 }, fontB64) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:"Rubik Mono One";src:url(data:font/woff2;base64,${fontB64}) format("woff2");}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:1200px;height:630px}
    .card{width:1200px;height:630px;background:#121116;display:flex;align-items:center;
      padding:34px 84px;gap:64px;overflow:hidden;position:relative}
    .accent-bar{position:absolute;left:0;top:0;bottom:0;width:14px;background:${accent}}
    .text{flex:1;min-width:0;align-self:stretch;display:flex;flex-direction:column}
    .main{flex:1;display:flex;flex-direction:column;justify-content:center}
    .name{font-family:"Rubik Mono One",monospace;font-size:104px;line-height:1.0;
      color:${accent};letter-spacing:-2px;text-transform:uppercase;white-space:nowrap}
    .tagline{margin-top:28px;font-family:"Avenir Next","Avenir",ui-rounded,system-ui,sans-serif;
      font-weight:600;font-size:40px;line-height:1.25;color:#e7e5e4;max-width:600px}
    .url{font-family:"Avenir Next","Avenir",ui-rounded,system-ui,sans-serif;
      font-weight:700;font-size:34px;color:${accent};letter-spacing:.5px}
    .phone{flex:none;align-self:center;width:288px;height:584px;background:#050506;border-radius:46px;
      padding:13px;box-shadow:0 30px 70px rgba(0,0,0,.55);
      border:1px solid rgba(255,255,255,.10)}
    .screen{width:100%;height:100%;border-radius:34px;overflow:hidden;background:#fff}
    .screen img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block}
  </style></head><body>
    <div class="card">
      <div class="accent-bar"></div>
      <div class="text">
        <div class="main">
          <div class="name">${name}</div>
          <div class="tagline">${tagline}</div>
        </div>
        <div class="url">wordgirl.net</div>
      </div>
      <div class="phone"><div class="screen"><img src="data:image/png;base64,${shotB64}"></div></div>
    </div>
  </body></html>`;
}

const fontB64 = findFont();
mkdirSync(join(root, "public/og"), { recursive: true });

// Serpentine's card traces the correct answer: compute today's solution path
// from the engine. Same local dateKey + "haiku" default as the served app, so
// it matches what the browser renders. Non-fatal if it fails.
{
  const d = new Date();
  const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  try {
    SERP_SOLUTION = await serpentineDailyPath(dateKey);
    console.log(`serpentine solution for ${dateKey}: ${SERP_SOLUTION.path.length} cells`);
  } catch (e) {
    console.warn("serpentine solution unavailable, will free-trace:", String(e).split("\n")[0]);
  }
}

// Serve the built app for live capture.
const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  cwd: root,
  stdio: "ignore",
});
const shutdown = () => { try { server.kill("SIGTERM"); } catch { /* already gone */ } };
process.on("exit", shutdown);
process.on("SIGINT", () => { shutdown(); process.exit(1); });

try {
  await waitForServer(BASE + "/", 60);
  const browser = await chromium.launch({ executablePath: CHROMIUM });

  // Light theme (white screen reads well against the dark card), phone size,
  // 2x for a crisp shot. Pre-seed every game's tutorialSeen flag so the
  // first-visit prompt never covers the board.
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: "light",
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript((ids) => {
    try {
      for (const id of ids) localStorage.setItem(`wg:v1:local:${id}:tutorialSeen`, "true");
    } catch { /* storage blocked — prompt may show; not fatal */ }
  }, GAMES.map((g) => g.id));

  // Card renderer reuses one page at 1200x630.
  const cardPage = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

  for (const g of GAMES) {
    const shot = await context.newPage();
    await shot.goto(`${BASE}/games/${g.id}`, { waitUntil: "networkidle" });
    await shot.evaluate(() => document.fonts.ready);
    await shot.waitForTimeout(700); // let the board settle / entrance anims finish
    await g.prep(shot); // leave the game mid-play
    // Never screenshot the hint menu: wait for any confirm dialog to close.
    // (No Escape — in Serpentine that would clear the trail we just drew.)
    await shot.locator('[role="dialog"]').waitFor({ state: "detached", timeout: 2000 }).catch(() => {});
    await shot.waitForTimeout(500);
    const shotB64 = (await shot.screenshot({ type: "png" })).toString("base64");
    await shot.close();

    await cardPage.setContent(cardHtml({ ...g, shotB64 }, fontB64), { waitUntil: "load" });
    await cardPage.evaluate(() => document.fonts.ready);
    await cardPage.evaluate(() => {
      const el = document.querySelector(".name");
      const col = document.querySelector(".text");
      let size = 104;
      while (el.scrollWidth > col.clientWidth && size > 48) {
        size -= 2;
        el.style.fontSize = size + "px";
      }
    });
    await cardPage.screenshot({ path: join(root, `public/og/${g.id}.png`), clip: { x: 0, y: 0, width: 1200, height: 630 } });
    console.log(`wrote public/og/${g.id}.png`);
  }

  await browser.close();
} finally {
  shutdown();
}
