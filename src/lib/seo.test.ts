import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { games } from "../games/registry";
import {
  SEO_GAMES,
  SITE,
  pageMeta,
  prerenderBody,
  renderSeo,
  sitemapUrls,
  structuredData,
} from "./seo";

const root = join(import.meta.dirname, "..", "..");

describe("SEO_GAMES", () => {
  it("mirrors the registry: same games, same order, same names", () => {
    // A new game that skipped seo.ts would ship with no page title, no
    // canonical, and no place in the sitemap.
    expect(SEO_GAMES.map((g) => [g.id, g.name])).toEqual(
      games.map((g) => [g.id, g.name]),
    );
  });

  it("titles stay short enough to show in full in a results page", () => {
    for (const g of SEO_GAMES) {
      expect(pageMeta(`/games/${g.id}/`).title.length).toBeLessThanOrEqual(60);
    }
  });
});

describe("pageMeta", () => {
  it("gives the hub and each game page a canonical in its served form", () => {
    expect(pageMeta("/").canonical).toBe(`${SITE}/`);
    expect(pageMeta("/games/sixfold").canonical).toBe(`${SITE}/games/sixfold/`);
    expect(pageMeta("/games/sixfold/").canonical).toBe(`${SITE}/games/sixfold/`);
    expect(pageMeta("/dictionary").canonical).toBe(`${SITE}/dictionary`);
  });

  it("titles the game sub-routes but keeps them out of the index", () => {
    for (const sub of ["practice", "stats", "tutorial", "archive", "archive/2026-08-01"]) {
      const meta = pageMeta(`/games/polygram/${sub}`);
      expect(meta.indexable).toBe(false);
      expect(meta.canonical).toBeNull();
    }
    expect(pageMeta("/games/polygram/archive").title).toBe("Polygram · Archive · WordGirl");
    expect(pageMeta("/games/polygram/archive/2026-08-01").title).toBe(
      "Polygram · Archive · 2026-08-01 · WordGirl",
    );
  });

  it("keeps unknown paths out of the index", () => {
    expect(pageMeta("/nope").indexable).toBe(false);
    expect(pageMeta("/games/nope").indexable).toBe(false);
  });
});

describe("prerenderBody", () => {
  it("gives every indexable page exactly one h1", () => {
    for (const url of sitemapUrls()) {
      const path = url.slice(SITE.length);
      expect(prerenderBody(path).match(/<h1>/g), path).toHaveLength(1);
    }
  });

  it("links a game page to every other game and to its guide", () => {
    const body = prerenderBody("/games/polygram/");
    for (const g of SEO_GAMES.filter((g) => g.id !== "polygram")) {
      expect(body).toContain(`href="/games/${g.id}/"`);
    }
    expect(body).toContain('href="/docs/games/polygram/"');
  });

  it("is empty where the page is not indexed", () => {
    expect(prerenderBody("/games/polygram/stats")).toBe("");
  });
});

describe("structuredData", () => {
  it("describes the hub as a site and each game as a game", () => {
    expect(structuredData("/")).toMatchObject({ "@type": "WebSite" });
    expect(structuredData("/games/typeset/")).toMatchObject({
      name: "Typeset",
      url: `${SITE}/games/typeset/`,
    });
    expect(structuredData("/dictionary")).toBeNull();
  });
});

describe("renderSeo", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const render = (src: string, path: string) =>
    renderSeo(src, pageMeta(path), prerenderBody(path), structuredData(path));

  it("fills index.html's title, description and both regions", () => {
    const out = render(html, "/games/crosshatch/");
    expect(out).toContain(`<title>${pageMeta("/games/crosshatch/").title}</title>`);
    expect(out).toContain(`content="${pageMeta("/games/crosshatch/").description}"`);
    expect(out).toContain(`<link rel="canonical" href="${SITE}/games/crosshatch/" />`);
    expect(out).toContain('<script type="application/ld+json">');
    expect(out).toMatch(/<!--seo:body--><div id="boot-about"><h1>/);
  });

  it("re-renders a rendered page cleanly (the shells start from the hub)", () => {
    const twice = render(render(html, "/"), "/games/crosshatch/");
    expect(twice).toBe(render(html, "/games/crosshatch/"));
  });

  it("marks a not-indexed page noindex, with no canonical", () => {
    const out = render(html, "/games/crosshatch/practice");
    expect(out).toContain('<meta name="robots" content="noindex" />');
    expect(out).not.toContain('rel="canonical"');
  });

  it("keeps the crawler text inside #root, where React replaces it", () => {
    const at = html.indexOf("<!--seo:body-->");
    expect(at).toBeGreaterThan(html.indexOf('<div id="root">'));
    expect(at).toBeLessThan(html.indexOf('<script type="module"'));
  });
});
