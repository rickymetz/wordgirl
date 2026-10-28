/// <reference types="vitest/config" />
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { auditCspHashes, cspHeaderValue } from "./src/lib/cspHashes";
import {
  APP_SHELL_META,
  SEO_GAMES,
  SITE,
  gameUrl,
  pageMeta,
  prerenderBody,
  renderSeo,
  sitemapXml,
  structuredData,
} from "./src/lib/seo";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

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
  { id: "sixfold", name: "Sixfold", tagline: "Solve the square. Find the words." },
  { id: "typeset", name: "Typeset", tagline: "Set, in type." },
] as const;

/** Rewrite the `content` of the one <meta> tag identified by attr="val". */
function setMeta(html: string, attr: "property" | "name", val: string, content: string): string {
  const tag = new RegExp(`<meta\\b[^>]*\\b${attr}="${val}"[^>]*>`);
  return html.replace(tag, (m) => m.replace(/content="[^"]*"/, `content="${content}"`));
}

/** A page's SEO meta, crawler text and structured data (src/lib/seo.ts). */
function seoFor(html: string, pathname: string): string {
  return renderSeo(
    html,
    pageMeta(pathname),
    prerenderBody(pathname),
    structuredData(pathname),
  );
}

/**
 * The hub's SEO regions, rendered into index.html itself — at transform
 * time, not after the bundle, so the precache manifest's revision for
 * index.html covers what is actually served.
 */
function seoHub(): Plugin {
  return {
    name: "wordgirl-seo-hub",
    transformIndexHtml(html) {
      return seoFor(html, "/");
    },
  };
}

/** The pages Netlify serves from their own static shell (netlify.toml). */
const PAGE_SHELLS = ["dictionary", "privacy", "terms"] as const;

/**
 * Emit a static shell for every page that has one. Each is the built
 * index.html — same hashed JS/CSS, so it boots the identical SPA — with
 * the page's own title, description, canonical, JSON-LD and crawler text
 * (src/lib/seo.ts), so search engines and link-readers see what the page
 * is before any JavaScript runs:
 *
 * - dist/games/<id>/index.html — each game. Its social-card meta is
 *   swapped too, so a link to /games/<id>/ unfurls AS that game.
 * - dist/{dictionary,privacy,terms}.html — rewritten to by netlify.toml.
 * - dist/app.html — the game sub-routes (practice, stats, tutorial,
 *   archive): no canonical, robots noindex, the generic card.
 *
 * Plus dist/sitemap.xml, listing exactly the pages marked indexable.
 * Unknown paths match no rewrite and get Netlify's real 404.
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
        // The sitemap lists SEO_GAMES; the shells come from OG_GAMES.
        // A game in one and not the other is a sitemap URL with no page.
        const ogIds = OG_GAMES.map((g) => g.id).join();
        const seoIds = SEO_GAMES.map((g) => g.id).join();
        if (ogIds !== seoIds) {
          throw new Error(
            `OG_GAMES (${ogIds}) and SEO_GAMES in src/lib/seo.ts (${seoIds}) must list the same games`,
          );
        }
        const base = readFileSync(join(outDir, "index.html"), "utf8");
        // These shells don't boot the hub, so the hub-shaped boot
        // skeleton would promise a layout the mount never delivers —
        // data-boot="game" hides it (index.html's inline boot style)
        // and leaves the route-agnostic spinner + note.
        const notHub = base.replace(
          /<html lang="en">/,
          `<html lang="en" data-boot="game">`,
        );
        for (const g of OG_GAMES) {
          const title = `${g.name} · WordGirl`;
          const desc = `${g.tagline} A new puzzle every day.`;
          const url = gameUrl(g.id);
          const img = `${SITE}/og/${g.id}.png`;
          let html = seoFor(notHub, `/games/${g.id}/`);
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
        for (const page of PAGE_SHELLS) {
          const meta = pageMeta(`/${page}`);
          let html = seoFor(notHub, `/${page}`);
          html = setMeta(html, "property", "og:title", meta.title);
          html = setMeta(html, "property", "og:url", meta.canonical!);
          html = setMeta(html, "name", "twitter:title", meta.title);
          writeFileSync(join(outDir, `${page}.html`), html);
        }
        writeFileSync(
          join(outDir, "app.html"),
          renderSeo(notHub, APP_SHELL_META, "", null),
        );
        writeFileSync(join(outDir, "sitemap.xml"), sitemapXml());
      },
    },
  };
}

/**
 * The CSP (netlify.toml) has no 'unsafe-inline': every inline <style>
 * and <script> the SITE SERVES must be individually allowed by a
 * committed 'sha256-…' source. netlify.toml is static config, so the
 * hashes cannot be injected at build time — instead this guard makes
 * drift a build failure, in both directions: a block whose token is
 * absent from ITS directive (the browser would silently refuse it),
 * and a stale sha256 source matching no shipped block (a standing
 * grant that only ever ratchets the policy looser). It audits every
 * built page Netlify serves with the header — index.html, 404.html
 * and the shells ogShells writes — via the pure helpers in
 * src/lib/cspHashes.ts (unit-tested there). Out of scope on purpose:
 * the service worker's OFFLINE_HTML (src/sw/appShell.ts) also carries
 * an inline style, but the worker synthesizes that Response itself, so
 * no Netlify header ever applies to it.
 */
function cspHashGuard(): Plugin {
  let outDir = "dist";
  let root = process.cwd();
  return {
    name: "wordgirl-csp-hash-guard",
    apply: "build",
    configResolved(cfg) {
      outDir = cfg.build.outDir;
      root = cfg.root;
    },
    closeBundle: {
      sequential: true,
      order: "post",
      handler() {
        const toml = readFileSync(join(root, "netlify.toml"), "utf8");
        const csp = cspHeaderValue(toml);
        if (!csp) {
          throw new Error(
            "netlify.toml: no Content-Security-Policy header found",
          );
        }
        const files = [
          "index.html",
          "404.html",
          ...OG_GAMES.map((g) => `games/${g.id}/index.html`),
          ...PAGE_SHELLS.map((p) => `${p}.html`),
          "app.html",
        ].map((name) => ({
          name,
          html: readFileSync(join(outDir, name), "utf8"),
        }));
        const { missing, stale } = auditCspHashes(files, csp);
        const problems = [...missing, ...stale];
        if (problems.length) {
          throw new Error(
            `CSP hash audit failed (netlify.toml):\n${problems.join("\n")}`,
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
    seoHub(),
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
