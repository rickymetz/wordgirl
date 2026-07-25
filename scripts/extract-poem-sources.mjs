#!/usr/bin/env node
/**
 * Normalize the poetry datasets Serpentine's corpus was transcribed from
 * into one source file for scripts/restore-punctuation.mjs.
 *
 *   git clone https://github.com/gautjac/le-recital
 *   git clone https://github.com/Emruur/BadPoets
 *   git clone https://github.com/j1mb0o/Lord-Generator
 *   git clone https://github.com/lingdojo/kana-dojo
 *   node scripts/extract-poem-sources.mjs <dir-holding-those> sources.jsonl
 *
 * Output is JSONL, one poem per line: {source, title, author, text}.
 * One poem per record is the point — punctuation only needs the text,
 * but telling an excerpt from a whole poem needs to know where a poem
 * ends, which a concatenated dump cannot say.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const [dir, out] = process.argv.slice(2);
if (!dir || !out) {
  console.error("usage: extract-poem-sources.mjs <clone-dir> <out.jsonl>");
  process.exit(2);
}

const read = (p) => JSON.parse(readFileSync(resolve(dir, p), "utf8"));
const has = (p) => existsSync(resolve(dir, p));

/** Each dataset's own shape, reduced to {title, author, text}. */
const DATASETS = [
  {
    source: "le-recital",
    path: "le-recital/iOS/Resources/Poems.json",
    poems: (j) => j.poems.map((p) => ({ title: p.title, author: p.author, text: p.lines.join("\n") })),
  },
  {
    source: "BadPoets",
    path: "BadPoets/poems/emily_dickinson_poems.json",
    poems: (j) => j.poems.map((p) => ({ title: p.title, author: p.author, text: p.lines.join("\n") })),
  },
  {
    source: "Lord-Generator",
    path: "Lord-Generator/data/byron_all_poems.json",
    poems: (j) => j.map((p) => ({ title: p.title, author: p.author, text: p.lines.join("\n") })),
  },
  {
    source: "kana-dojo",
    path: "kana-dojo/community/content/japanese-haiku.json",
    poems: (j) => j.map((h) => ({ title: h.kigo ?? "", author: h.poet, text: h.english })),
  },
  {
    source: "kana-dojo-backlog",
    path: "kana-dojo/community/backlog/haiku-backlog.json",
    poems: (j) => j.map((h) => ({ title: h.kigo ?? "", author: h.poet, text: h.english })),
  },
];

const records = [];
for (const set of DATASETS) {
  if (!has(set.path)) {
    console.warn(`skipped ${set.source} — ${set.path} not found`);
    continue;
  }
  const poems = set.poems(read(set.path)).filter((p) => p.text);
  for (const poem of poems) records.push({ source: set.source, ...poem });
  console.log(`${set.source.padEnd(18)} ${String(poems.length).padStart(5)} poems`);
}

writeFileSync(out, records.map((r) => JSON.stringify(r)).join("\n") + "\n");
console.log(`\nwrote ${records.length} poems to ${out}`);
