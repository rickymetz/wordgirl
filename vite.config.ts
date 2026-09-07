/// <reference types="vitest/config" />
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const SITE = "https://wordgirl.net";

/**
 * Per-game social-card metadata. Kept here rather than imported from
 * src/games/registry.ts because that pulls in the whole React app, which
 * has no place in the build config. Mirror any name/tagline change here;
 * the accent-coloured card image itself is built by scripts/build-og-cards.mjs.
 */
const OG_GAMES = [
  { id: "polygram", name: "Polygram", tagline: "Spell your way from triangle to decagon." },
  { id: "crosshatch", name: "Crosshatch", tagline: "Every way the words fit." },
  { id: "pierglass", name: "Pierglass", tagline: "Every word, a reflection." },
  { id: "doublet", name: "Doublet", tagline: "Place the tiles. Spell the words." },
  { id: "serpentine", name: "Serpentine", tagline: "One continuous line." },
] as const;

/** Rewrite the `content` of the one <meta> tag identified by attr="val". */
function setMeta(html: string, attr: "property" | "name", val: string, content: string): string {
  const tag = new RegExp(`<meta\\b[^>]*\\b${attr}="${val}"[^>]*>`);
  return html.replace(tag, (m) => m.replace(/content="[^"]*"/, `content="${content}"`));
}

/**
 * Emit a static per-game shell at dist/games/<id>/index.html. It is the
 * built index.html — same hashed JS/CSS, so it boots the identical SPA —
 * with only the social-card meta swapped, so a link to /games/<id> unfurls
 * AS that game instead of the generic hub card. Netlify serves this real
 * file before the /* -> /index.html catch-all, so humans still get the app.
 *
 * Deep sub-routes (/games/<id>/archive, /stats, /tutorial, /practice) are
 * left to the SPA catch-all and keep the generic card by design.
 */
function ogShells(): Plugin {
  let outDir = "dist";
  return {
    name: "wordgirl-og-shells",
    apply: "build",
    configResolved(cfg) {
      outDir = cfg.build.outDir;
    },
    // After the PWA plugin has finished writing the bundle.
    closeBundle: {
      sequential: true,
      order: "post",
      handler() {
        const base = readFileSync(join(outDir, "index.html"), "utf8");
        for (const g of OG_GAMES) {
          const title = `${g.name} · WordGirl`;
          const desc = `${g.tagline} A new puzzle every day.`;
          const url = `${SITE}/games/${g.id}`;
          const img = `${SITE}/og/${g.id}.png`;
          // These shells boot a GAME, so the hub-shaped boot skeleton
          // would promise a layout the mount never delivers —
          // data-boot="game" hides it (index.css) and leaves the
          // route-agnostic spinner + note.
          let html = base.replace(
            /<html lang="en">/,
            `<html lang="en" data-boot="game">`,
          );
          html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
          html = setMeta(html, "name", "description", desc);
          html = setMeta(html, "property", "og:title", title);
          html = setMeta(html, "property", "og:description", desc);
          html = setMeta(html, "property", "og:url", url);
          html = setMeta(html, "property", "og:image", img);
          html = setMeta(html, "name", "twitter:title", title);
          html = setMeta(html, "name", "twitter:description", desc);
          html = setMeta(html, "name", "twitter:image", img);
          const dir = join(outDir, "games", g.id);
          mkdirSync(dir, { recursive: true });
          writeFileSync(join(dir, "index.html"), html);
        }
      },
    },
  };
}

/**
 * The CSP (netlify.toml) has no 'unsafe-inline': every inline <style>
 * and <script> the site ships must be individually allowed by a
 * committed 'sha256-…' source. netlify.toml is static config, so the
 * hashes cannot be injected at build time — instead this guard makes
 * DRIFT a build failure: it hashes every inline block in the built
 * index.html and 404.html exactly as served (the per-game OG shells
 * copy index.html, so they carry the same blocks) and fails the build
 * naming the missing tokens. Without it, editing the inline boot CSS
 * ships a page whose styles the browser silently refuses.
 */
function cspHashGuard(): Plugin {
  let outDir = "dist";
  return {
    name: "wordgirl-csp-hash-guard",
    apply: "build",
    configResolved(cfg) {
      outDir = cfg.build.outDir;
    },
    closeBundle: {
      sequential: true,
      order: "post",
      handler() {
        const csp = readFileSync("netlify.toml", "utf8");
        const missing: string[] = [];
        for (const file of ["index.html", "404.html"]) {
          const html = readFileSync(join(outDir, file), "utf8");
          for (const kind of ["style", "script"] as const) {
            // Inline blocks only — a tag with src= is covered by 'self'
            // or an allowed host, not a hash.
            const tag = new RegExp(
              `<${kind}(?![^>]*\\bsrc=)[^>]*>([\\s\\S]*?)</${kind}>`,
              "g",
            );
            for (const m of html.matchAll(tag)) {
              const hash = createHash("sha256")
                .update(m[1], "utf8")
                .digest("base64");
              const token = `'sha256-${hash}'`;
              if (!csp.includes(token)) {
                missing.push(`${file} inline <${kind}>: ${token}`);
              }
            }
          }
        }
        if (missing.length) {
          throw new Error(
            `netlify.toml CSP is missing hashes for inline content — add each ` +
              `to its style-src/script-src:\n${missing.join("\n")}`,
          );
        }
      },
    },
  };
}

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          motion: ["motion/react"],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    ogShells(),
    cspHashGuard(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      // injectManifest, not generateSW: a generated worker's navigation
      // route rejects when the precache is missing and the network
      // fails, and an installed iOS app renders that as a blank white
      // screen. src/sw.ts owns the navigation handler so every
      // navigation ends in a document.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,txt,svg,png,woff2}"],
      },
      manifest: {
        name: "WordGirl",
        short_name: "WordGirl",
        description: "A little collection of games, made with love.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
          { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.dom.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          include: ["src/**/*.dom.test.ts"],
          environment: "jsdom",
        },
      },
    ],
  },
});
