// Generates per-game social-share cards (1200x630) into public/og/<id>.png.
//
// These back the per-game <meta property="og:image"> tags emitted by the
// og-shells Vite plugin (see vite.config.ts). A shared link to
// /games/<id> then unfurls AS that game — its name, tagline, accent and
// board art — instead of the generic hub card.
//
// This is a ONE-TIME asset step, run by hand when a game's name, tagline,
// accent, or teaser changes — it needs a browser, so it is deliberately
// NOT part of `npm run build` (which must run headless in CI). Same shape
// as scripts/build-dictionary.mjs: a committed generator whose OUTPUT is
// committed too. Run against a fresh `npm run build` so the font asset
// exists:  node scripts/build-og-cards.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHROMIUM = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium";

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

function cardHtml({ name, tagline, accent, teaserB64 }, fontB64) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:"Rubik Mono One";src:url(data:font/woff2;base64,${fontB64}) format("woff2");}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:1200px;height:630px}
    .card{width:1200px;height:630px;background:#121116;display:flex;align-items:center;
      padding:0 72px;gap:56px;overflow:hidden;position:relative}
    .accent-bar{position:absolute;left:0;top:0;bottom:0;width:14px;background:${accent}}
    .text{flex:1;min-width:0}
    .name{font-family:"Rubik Mono One",monospace;font-size:104px;line-height:1.0;
      color:${accent};letter-spacing:-2px;text-transform:uppercase;white-space:nowrap}
    .tagline{margin-top:28px;font-family:"Avenir Next","Avenir",ui-rounded,system-ui,sans-serif;
      font-weight:600;font-size:40px;line-height:1.25;color:#e7e5e4;max-width:640px}
    .foot{margin-top:44px;display:flex;align-items:center;gap:14px;
      font-family:"Avenir Next",system-ui,sans-serif;font-weight:700;font-size:30px;color:#a8a29e}
    .dot{width:10px;height:10px;border-radius:50%;background:${accent}}
    .shot{width:300px;height:534px;flex:none;border-radius:34px;overflow:hidden;
      box-shadow:0 24px 60px rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08)}
    .shot img{width:100%;height:100%;object-fit:cover;object-position:top}
  </style></head><body>
    <div class="card">
      <div class="accent-bar"></div>
      <div class="text">
        <div class="name">${name}</div>
        <div class="tagline">${tagline}</div>
        <div class="foot"><span class="dot"></span>WordGirl · a new puzzle every day · wordgirl.net</div>
      </div>
      <div class="shot"><img src="data:image/png;base64,${teaserB64}"></div>
    </div>
  </body></html>`;
}

const fontB64 = findFont();
mkdirSync(join(root, "public/og"), { recursive: true });
const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const g of GAMES) {
  const teaserB64 = readFileSync(join(root, `public/teasers/${g.id}.png`)).toString("base64");
  await page.setContent(cardHtml({ ...g, teaserB64 }, fontB64), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  // Shrink the wordmark until it fits its column (SERPENTINE/CROSSHATCH are
  // wide in Rubik Mono One and would otherwise clip under the phone).
  await page.evaluate(() => {
    const el = document.querySelector(".name");
    const col = document.querySelector(".text");
    let size = 104;
    while (el.scrollWidth > col.clientWidth && size > 48) {
      size -= 2;
      el.style.fontSize = size + "px";
    }
  });
  await page.screenshot({ path: join(root, `public/og/${g.id}.png`), clip: { x: 0, y: 0, width: 1200, height: 630 } });
  console.log(`wrote public/og/${g.id}.png`);
}
await browser.close();
