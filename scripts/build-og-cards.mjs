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

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHROMIUM = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium";
const PORT = Number(process.env.OG_PORT || 4185);
const BASE = `http://localhost:${PORT}`;

// Dark-theme accent per game (from src/index.css [data-level=...]). The card
// is always dark, so it takes the dark-mode value of each light-dark() pair.
const GAMES = [
  { id: "polygram", name: "Polygram", tagline: "Spell your way from triangle to decagon.", accent: "#f87171" },
  { id: "crosshatch", name: "Crosshatch", tagline: "Every way the words fit.", accent: "#3ddbd9" },
  { id: "pierglass", name: "Pierglass", tagline: "Every word, a reflection.", accent: "#e879f9" },
  { id: "doublet", name: "Doublet", tagline: "Place the tiles. Spell the words.", accent: "#fbbf24" },
  { id: "serpentine", name: "Serpentine", tagline: "One continuous line.", accent: "#a3e635" },
];

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
      padding:0 84px;gap:64px;overflow:hidden;position:relative}
    .accent-bar{position:absolute;left:0;top:0;bottom:0;width:14px;background:${accent}}
    .text{flex:1;min-width:0}
    .name{font-family:"Rubik Mono One",monospace;font-size:104px;line-height:1.0;
      color:${accent};letter-spacing:-2px;text-transform:uppercase;white-space:nowrap}
    .tagline{margin-top:28px;font-family:"Avenir Next","Avenir",ui-rounded,system-ui,sans-serif;
      font-weight:600;font-size:40px;line-height:1.25;color:#e7e5e4;max-width:600px}
    .foot{margin-top:44px;display:flex;align-items:center;gap:14px;
      font-family:"Avenir Next",system-ui,sans-serif;font-weight:700;font-size:29px;color:#a8a29e}
    .dot{width:10px;height:10px;border-radius:50%;background:${accent}}
    .phone{flex:none;width:288px;height:584px;background:#050506;border-radius:46px;
      padding:13px;box-shadow:0 30px 70px rgba(0,0,0,.55);
      border:1px solid rgba(255,255,255,.10)}
    .screen{width:100%;height:100%;border-radius:34px;overflow:hidden;background:#fff}
    .screen img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block}
  </style></head><body>
    <div class="card">
      <div class="accent-bar"></div>
      <div class="text">
        <div class="name">${name}</div>
        <div class="tagline">${tagline}</div>
        <div class="foot"><span class="dot"></span>WordGirl · a new puzzle every day · wordgirl.net</div>
      </div>
      <div class="phone"><div class="screen"><img src="data:image/png;base64,${shotB64}"></div></div>
    </div>
  </body></html>`;
}

const fontB64 = findFont();
mkdirSync(join(root, "public/og"), { recursive: true });

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
    await shot.waitForTimeout(900); // let the board settle / entrance anims finish
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
