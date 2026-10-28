/**
 * What search engines and link-readers are told about each page: titles,
 * descriptions, canonicals, indexability, and the static text a crawler
 * finds in the HTML before any JavaScript runs.
 *
 * One source for two consumers, so they can't disagree: the build
 * (vite.config.ts — prerenders it into index.html, the per-game shells,
 * the dictionary/legal shells and the sitemap) and the app
 * (usePageMeta — keeps document.title, the description, robots and the
 * canonical in step with client-side navigation). Pure data and string
 * helpers, no React and no DOM, because the build config imports it.
 *
 * Copy follows the house rules: neutral and descriptive. Game ids and
 * order mirror src/games/registry.ts (seo.test.ts pins that).
 */

export const SITE = "https://wordgirl.net";

export interface SeoGame {
  id: string;
  name: string;
  /** What the game is, in the words people search for. The page's h1. */
  headline: string;
  description: string;
  /** One line for the hub's game list. */
  blurb: string;
  /** The kind of game, in a few words, for the hub's description. */
  kind: string;
  howTo: string[];
  /** The game's page in the docs site, or null where none exists yet. */
  guide: string | null;
}

export const SEO_GAMES: readonly SeoGame[] = [
  {
    id: "polygram",
    kind: "anagrams",
    name: "Polygram",
    headline: "Polygram: daily anagram word game",
    description:
      "A daily anagram game: make words from the letters of a polygon, from a triangle of three letters up to a decagon of ten. Free, in your browser.",
    blurb: "an anagram game that grows from a triangle of letters to a decagon.",
    howTo: [
      "Make words from the letters on the polygon. Each word has as many letters as the shape has sides, and a letter can be used more than once.",
      "Find all the required words to add a letter and move up a level, from a triangle to a decagon.",
      "Rare words count as bonus words. A hint shows one letter of a word you have not found.",
    ],
    guide: "/docs/games/polygram/",
  },
  {
    id: "crosshatch",
    kind: "a crossword fill-in",
    name: "Crosshatch",
    headline: "Crosshatch: daily crossword fill-in puzzle",
    description:
      "A daily crossword fill-in puzzle: a small frame with a few letters given and many ways to fill it. Find every word that fits. Free, in your browser.",
    blurb: "a small crossword frame with many ways to fill it.",
    howTo: [
      "Fill the frame with letters so that every line is a word that agrees with the given letters.",
      "Submit the frame to keep its new words. One frame can find several words at once.",
      "Find every word that can fit to finish the board. Each day has a Normal and a Hard board.",
    ],
    guide: "/docs/games/crosshatch/",
  },
  {
    id: "pierglass",
    kind: "palindromes",
    name: "Pierglass",
    headline: "Pierglass: daily palindrome word game",
    description:
      "A daily palindrome and mirror-word game: spell words like LEVEL and pairs like STOP and POTS against a mirror until every letter is used.",
    blurb: "palindromes and mirror words, spelled against a mirror.",
    howTo: [
      "Put letters on your side of the mirror. The mirror shows the rest.",
      "A pair is a word that spells another word backwards, like STOP and POTS. A palindrome reads the same both ways, like LEVEL, so you place only its first half.",
      "Use every letter in the set to finish the day. Most days can be solved more than one way.",
    ],
    guide: "/docs/games/pierglass/",
  },
  {
    id: "doublet",
    kind: "word dominoes",
    name: "Doublet",
    headline: "Doublet: daily word domino puzzle",
    description:
      "A daily letter-domino puzzle: place two-letter dominoes on a board so that every line spells a word. Easy, Medium and Hard boards.",
    blurb: "letter dominoes placed so that every line spells a word.",
    howTo: [
      "Drag the two-letter dominoes onto the board, turning them as needed.",
      "Every line of two or more letters must spell a word.",
      "Each board has one solution. Choose Easy, Medium or Hard.",
    ],
    guide: "/docs/games/doublet/",
  },
  {
    id: "serpentine",
    kind: "a poem path",
    name: "Serpentine",
    headline: "Serpentine: daily poem word puzzle",
    description:
      "A daily poem puzzle: draw one continuous path through a grid of letters to reveal a hidden line of poetry, a haiku or a line from an English poem.",
    blurb: "one continuous path through a letter grid that spells a line of poetry.",
    howTo: [
      "Drag through neighboring letters, diagonals included, to draw one continuous path.",
      "The path passes through every cell exactly once and spells the hidden line in order.",
      "Each day has a haiku and a line from an English poem, all in the public domain.",
    ],
    guide: "/docs/games/serpentine/",
  },
  {
    id: "sixfold",
    kind: "a letter sudoku",
    name: "Sixfold",
    headline: "Sixfold: daily 6×6 word sudoku",
    description:
      "A daily 6×6 letter sudoku: fill the grid so each row, column and box holds six letters once, and two of its lines spell words from the same letters.",
    blurb: "a 6×6 letter sudoku whose lines spell two words.",
    howTo: [
      "Tap a cell, then a letter. Every row, column and 2×3 box holds each of the six letters once.",
      "The shaded row answers the clue above the grid.",
      "A second shaded line spells another word from the same six letters, with no clue.",
    ],
    guide: "/docs/games/sixfold/",
  },
  {
    id: "typeset",
    kind: "a font puzzle",
    name: "Typeset",
    headline: "Typeset: daily font puzzle",
    description:
      "A daily font and type puzzle: find sets of three cards by character, count, color and fill. One board compares a letter in three typefaces.",
    blurb: "find sets of three cards by character, typeface, count, color and fill.",
    howTo: [
      "Tap three cards. They form a set when the character, count, color and fill are each all the same or all different across the three.",
      "Find every set on the board. The board says how many there are, and wrong guesses are counted, never penalized.",
      "Each day has two boards: Character set, and Faces, where the cards show one letter in three different typefaces.",
    ],
    guide: null,
  },
];

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve",
];

const HUB_HEADLINE = "WordGirl: free daily word games";

export interface PageMeta {
  title: string;
  description: string;
  /** Absolute canonical URL; null on pages that are not indexed. */
  canonical: string | null;
  indexable: boolean;
}

const SUFFIX = " · WordGirl";

const STATIC_PAGES: Record<string, PageMeta> = {
  "/": {
    title: HUB_HEADLINE,
    description: `${capitalize(NUMBER_WORDS[SEO_GAMES.length] ?? String(SEO_GAMES.length))} free word games with a new puzzle every day: ${listJoin(SEO_GAMES.map((g) => g.kind))}. No account needed.`,
    canonical: `${SITE}/`,
    indexable: true,
  },
  "/dictionary": {
    title: `Dictionary${SUFFIX}`,
    description:
      "Search every word the WordGirl games accept. Use * for any letters and ? for one, filter by length, and save words.",
    canonical: `${SITE}/dictionary`,
    indexable: true,
  },
  "/privacy": {
    title: `Privacy${SUFFIX}`,
    description:
      "WordGirl has no accounts and sets no cookies. Your progress stays on your device.",
    canonical: `${SITE}/privacy`,
    indexable: true,
  },
  "/terms": {
    title: `Terms${SUFFIX}`,
    description: "The terms for playing WordGirl.",
    canonical: `${SITE}/terms`,
    indexable: true,
  },
};

/** The not-indexed shell the game sub-routes boot from (app.html). */
export const APP_SHELL_META: PageMeta = {
  title: "WordGirl",
  description: STATIC_PAGES["/"].description,
  canonical: null,
  indexable: false,
};

const SUB_LABELS: Record<string, string> = {
  practice: "Practice",
  stats: "Stats",
  tutorial: "Tutorial",
  archive: "Archive",
};

function listJoin(items: string[]): string {
  return items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The canonical URL of a game's page (trailing slash: the form Netlify serves). */
export function gameUrl(id: string): string {
  return `${SITE}/games/${id}/`;
}

/**
 * Meta for any path the app routes. Game sub-routes (practice, stats,
 * tutorial, archive and its days) get their own titles but are not
 * indexed: they are states of the game's one page, thin on their own,
 * and the archive's days are unbounded.
 */
export function pageMeta(pathname: string): PageMeta {
  const path =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") || "/" : pathname;
  const fixed = STATIC_PAGES[path];
  if (fixed) return fixed;

  const m = path.match(/^\/games\/([^/]+)(?:\/(.*))?$/);
  const game = m && SEO_GAMES.find((g) => g.id === m[1]);
  if (game) {
    const rest = m[2];
    if (!rest) {
      return {
        title: `${game.headline}${SUFFIX}`,
        description: game.description,
        canonical: gameUrl(game.id),
        indexable: true,
      };
    }
    const [section, day] = rest.split("/");
    const label = SUB_LABELS[section] ?? null;
    const parts = [game.name, label, section === "archive" ? day : undefined]
      .filter(Boolean)
      .join(" · ");
    return {
      title: `${parts}${SUFFIX}`,
      description: game.description,
      canonical: null,
      indexable: false,
    };
  }
  return { ...APP_SHELL_META };
}

// --- Static HTML for crawlers -------------------------------------------

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/*
 * Links carry tabindex="-1": the block is visually hidden (see #boot-about
 * in index.html) and lives only until React mounts, so a keyboard user
 * must not tab onto a link they cannot see. Screen readers still read it.
 */
function link(href: string, text: string): string {
  return `<a href="${esc(href)}" tabindex="-1">${esc(text)}</a>`;
}

function gameList(games: readonly SeoGame[]): string {
  const items = games
    .map((g) => `<li>${link(`/games/${g.id}/`, g.name)}: ${esc(g.blurb)}</li>`)
    .join("");
  return `<ul>${items}</ul>`;
}

const FOOTER_LINKS = `<p>${link("/dictionary", "Dictionary")} · ${link("/docs/", "Guide")} · ${link("/privacy", "Privacy")} · ${link("/terms", "Terms")}</p>`;

/**
 * The text a crawler reads in a page's raw HTML: the h1, what the page is,
 * how to play, and links on to the rest of the site. Only the hub and the
 * game pages have a body; the dictionary and legal pages get their title,
 * description and h1.
 */
export function prerenderBody(pathname: string): string {
  const meta = pageMeta(pathname);
  if (!meta.indexable) return "";
  const id = pathname.match(/^\/games\/([^/]+)\/?$/)?.[1];
  const game = id ? SEO_GAMES.find((g) => g.id === id) : undefined;

  if (game) {
    const steps = game.howTo.map((s) => `<li>${esc(s)}</li>`).join("");
    const guide = game.guide
      ? `<p>${link(game.guide, `Full ${game.name} rules, and how each puzzle is made`)}</p>`
      : "";
    const others = SEO_GAMES.filter((g) => g.id !== game.id);
    return (
      `<h1>${esc(game.headline)}</h1>` +
      `<p>${esc(game.description)}</p>` +
      `<p>A new puzzle every day, the same for everyone. Each game also has practice puzzles, an archive of past days, stats and a tutorial. No account needed; progress stays on your device.</p>` +
      `<h2>How to play ${esc(game.name)}</h2><ol>${steps}</ol>${guide}` +
      `<h2>More daily word games</h2>${gameList(others)}` +
      `<p>${link("/", "All WordGirl games")}</p>${FOOTER_LINKS}`
    );
  }
  if (pathname === "/") {
    return (
      `<h1>${esc(HUB_HEADLINE)}</h1>` +
      `<p>${esc(meta.description)}</p>` +
      `<p>A new puzzle every day in every game, the same for everyone. Each game also has practice puzzles, an archive of past days, stats and a tutorial. Progress stays on your device, and the games work offline.</p>` +
      `<h2>The games</h2>${gameList(SEO_GAMES)}${FOOTER_LINKS}`
    );
  }
  return `<h1>${esc(meta.title.replace(SUFFIX, ""))}</h1><p>${esc(meta.description)}</p>${FOOTER_LINKS}`;
}

/** schema.org structured data for a page, or null. */
export function structuredData(pathname: string): object | null {
  const website = {
    "@type": "WebSite",
    name: "WordGirl",
    url: `${SITE}/`,
  };
  if (pathname === "/") {
    return {
      "@context": "https://schema.org",
      ...website,
      description: STATIC_PAGES["/"].description,
      hasPart: SEO_GAMES.map((g) => ({
        "@type": "WebApplication",
        name: g.name,
        url: gameUrl(g.id),
      })),
    };
  }
  const id = pathname.match(/^\/games\/([^/]+)\/?$/)?.[1];
  const game = id ? SEO_GAMES.find((g) => g.id === id) : undefined;
  if (!game) return null;
  return {
    "@context": "https://schema.org",
    "@type": ["VideoGame", "WebApplication"],
    name: game.name,
    url: gameUrl(game.id),
    description: game.description,
    genre: "Word game",
    applicationCategory: "GameApplication",
    operatingSystem: "Any (web browser)",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    inLanguage: "en",
    isPartOf: website,
  };
}

function setTagContent(
  html: string,
  attr: "name" | "property",
  key: string,
  content: string,
): string {
  const tag = new RegExp(`<meta\\b[^>]*\\b${attr}="${key}"[^>]*>`);
  return html.replace(tag, (m) =>
    m.replace(/content="[^"]*"/, `content="${esc(content)}"`),
  );
}

/**
 * Fill a built page's SEO regions: <title>, the description, and the two
 * marked regions in index.html — `<!--seo:head-->…<!--/seo:head-->`
 * (canonical, robots, JSON-LD) and `<!--seo:body-->…<!--/seo:body-->`
 * (the crawler text inside #root). Idempotent: the markers stay, so the
 * build can render the hub into index.html and then re-render each shell
 * from it. Social-card tags (og:*, twitter:*) are left to the caller.
 */
export function renderSeo(
  html: string,
  meta: PageMeta,
  body: string,
  data: object | null,
): string {
  const head = [
    meta.canonical ? `<link rel="canonical" href="${esc(meta.canonical)}" />` : "",
    meta.indexable ? "" : `<meta name="robots" content="noindex" />`,
    data
      ? `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`
      : "",
  ]
    .filter(Boolean)
    .join("\n    ");
  const replaceRegion = (src: string, name: string, content: string) => {
    const re = new RegExp(`<!--seo:${name}-->[\\s\\S]*?<!--/seo:${name}-->`);
    if (!re.test(src)) throw new Error(`renderSeo: missing <!--seo:${name}--> region`);
    return src.replace(re, () => `<!--seo:${name}-->${content}<!--/seo:${name}-->`);
  };
  let out = html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(meta.title)}</title>`);
  out = setTagContent(out, "name", "description", meta.description);
  out = replaceRegion(out, "head", head);
  out = replaceRegion(out, "body", body ? `<div id="boot-about">${body}</div>` : "");
  return out;
}

/** Every indexable page's canonical URL, for the sitemap. */
export function sitemapUrls(): string[] {
  const [hub, ...rest] = Object.values(STATIC_PAGES).map((p) => p.canonical!);
  return [hub, ...SEO_GAMES.map((g) => gameUrl(g.id)), ...rest];
}

export function sitemapXml(): string {
  const urls = sitemapUrls()
    .map((u) => `  <url><loc>${esc(u)}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
