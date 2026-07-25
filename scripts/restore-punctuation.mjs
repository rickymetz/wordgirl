#!/usr/bin/env node
/**
 * Restore the punctuation of Serpentine's poem corpus from its sources,
 * and mark which phrases are excerpts.
 *
 *   node scripts/extract-poem-sources.mjs <clone-dir> sources.jsonl
 *   node scripts/restore-punctuation.mjs [--write] sources.jsonl
 *
 * The corpus in `src/games/serpentine/engine/puzzles.ts` was transcribed
 * by stripping punctuation, which is unrecoverable from the phrase
 * itself — "AWAY AWAY YOUR FLATTERING ARTS" holds no trace of the two
 * commas Byron wrote. So it is taken from the source, never guessed:
 *
 * 1. Reduce each source poem to its letters, remembering where every
 *    letter sat in the original.
 * 2. Find each phrase's letter sequence in that reduction. A phrase that
 *    matches nowhere, or in two places that disagree, is left alone.
 * 3. Lift the source span the letters came from, keeping its marks, plus
 *    any sentence ender sitting just past the last letter.
 * 4. Assert the lifted span has exactly the phrase's letters, in order.
 *    Punctuation may not add, drop, or reorder a single grid cell.
 * 5. A phrase whose letters are the whole poem's is the poem; anything
 *    shorter is an excerpt, and the corpus entry gets a trailing `true`
 *    so the game can say "from" before the title.
 *
 * Prints a coverage report. Without --write it changes nothing, which is
 * the way to review what a source would do before trusting it.
 *
 * A restored `?` would collide with the `?` the readout draws for a
 * hidden letter, so SnakeText draws every mark in the accent — keep it
 * that way if you re-run this against a wider source.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = resolve(__dirname, "../src/games/serpentine/engine/puzzles.ts");

/** Marks the readout can draw. Anything else is dropped from a span. */
const KEEP = new Set([" ", "'", "-", "—", ",", ".", ";", ":", "!", "?"]);

/** Fold a source text's typography into the corpus's own vocabulary. */
function normalize(raw) {
  return raw
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–|--/g, "—")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

/** Letters of `text`, plus the offset in `text` each letter came from. */
function lettersOf(text) {
  let letters = "";
  const offsets = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch >= "A" && ch <= "Z") {
      letters += ch;
      offsets.push(i);
    }
  }
  return { letters, offsets };
}

/** A lifted span, reduced to letters, spaces, and the marks we draw. */
function cleanSpan(span) {
  const out = [...span]
    .filter((ch) => (ch >= "A" && ch <= "Z") || KEEP.has(ch))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    // Marks bind to the word on their left, so a space-set dash
    // ("KINSMEN — AFTER") does not become a wordless word the readout
    // has nothing to anchor — or draw. An apostrophe is exempt when it
    // opens the next word instead of closing the last one ('TIS).
    .replace(/\s+([\-—,.;:!?]['\-—,.;:!?]*)/g, "$1")
    // Nothing can lead the phrase but a letter or its own apostrophe.
    .replace(/^[\-—,.;:!?]+\s*/, "");
  return out;
}

/** Load JSONL poems — one record per poem, so a poem's end is known. */
function loadPoems(paths) {
  const poems = [];
  for (const path of paths) {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      if (!line.trim()) continue;
      const record = JSON.parse(line);
      const text = normalize(record.text);
      poems.push({ ...record, text, ...lettersOf(text) });
    }
  }
  return poems;
}

/**
 * Every distinct punctuated span in the sources that spells `phrase`,
 * and whether any of them is a whole poem rather than a piece of one.
 * More than one distinct span means the sources disagree, and the phrase
 * is not safe to rewrite.
 */
function candidates(poems, phrase) {
  const target = phrase.replace(/[^A-Z]/g, "");
  const found = new Set();
  let whole = false;
  for (const poem of poems) {
    let at = poem.letters.indexOf(target);
    while (at !== -1) {
      const from = poem.offsets[at];
      const to = poem.offsets[at + target.length - 1];
      // A phrase is usually an excerpt, so a trailing comma would dangle
      // — but a sentence ender belongs to the line and is kept.
      const ender = /^[.!?]/.exec(poem.text.slice(to + 1));
      const span = cleanSpan(poem.text.slice(from, to + 1 + (ender ? 1 : 0)));
      if (span.replace(/[^A-Z]/g, "") === target) {
        found.add(span);
        // Same letters as the whole poem: this IS the poem, not a cut
        // from it. One such match is enough — a line that stands alone
        // somewhere is not an excerpt just because a longer poem quotes it.
        if (poem.letters.length === target.length) whole = true;
      }
      at = poem.letters.indexOf(target, at + 1);
    }
  }
  return { spans: [...found], excerpt: !whole };
}

const args = process.argv.slice(2);
const write = args.includes("--write");
const sourcePaths = args.filter((a) => a !== "--write");
if (sourcePaths.length === 0) {
  console.error("usage: restore-punctuation.mjs [--write] <sources.jsonl>...");
  process.exit(2);
}

const poems = loadPoems(sourcePaths);
const corpus = readFileSync(CORPUS, "utf8");
// A PoemEntry is [author, title, phrase] with an optional trailing
// `true` marking an excerpt. The phrase's class holds every mark the
// readout draws, and the flag is matched too, so a run over an already
// restored corpus re-derives it instead of skipping it.
const ENTRY =
  /(\[\s*"(?:[^"\\]|\\.)*"\s*,\s*"(?:[^"\\]|\\.)*"\s*,\s*")([A-Z '\-—,.;:!?]+)("\s*)(,\s*true\s*)?(\])/g;

const report = { total: 0, matched: 0, excerpts: 0, restored: [], rewritten: 0, missing: [], ambiguous: [] };

const updated = corpus.replace(ENTRY, (all, head, phrase, mid, flag, tail) => {
  report.total++;
  const { spans, excerpt } = candidates(poems, phrase);
  if (spans.length === 0) {
    report.missing.push(phrase);
    return all;
  }
  if (spans.length > 1) {
    report.ambiguous.push({ phrase, spans });
    return all;
  }
  report.matched++;
  if (excerpt) report.excerpts++;
  const [span] = spans;
  const nextFlag = excerpt ? ", true" : "";
  if (span !== phrase) report.restored.push({ from: phrase, to: span });
  if (span === phrase && (flag ?? "").trim() === nextFlag.trim()) return all;
  report.rewritten++;
  return head + span + mid + nextFlag + tail;
});

console.log(`poems       ${poems.length} from ${sourcePaths.map((p) => basename(p)).join(", ")}`);
console.log(`phrases     ${report.total}`);
console.log(`matched     ${report.matched}  (${report.excerpts} excerpts, ${report.matched - report.excerpts} whole poems)`);
console.log(`punctuated  ${report.restored.length} phrases gained marks`);
console.log(`rewritten   ${report.rewritten} entries differ from the file`);
console.log(`no match    ${report.missing.length}`);
console.log(`ambiguous   ${report.ambiguous.length}`);

for (const { from, to } of report.restored.slice(0, 20)) {
  console.log(`\n  - ${from}\n  + ${to}`);
}
if (report.restored.length > 20) console.log(`\n  ...and ${report.restored.length - 20} more`);
for (const { phrase, spans } of report.ambiguous.slice(0, 5)) {
  console.log(`\n  ? ${phrase}`);
  for (const s of spans) console.log(`      ${s}`);
}

if (write) {
  writeFileSync(CORPUS, updated);
  console.log(`\nwrote ${report.rewritten} entries to ${basename(CORPUS)}`);
} else {
  console.log("\ndry run — pass --write to apply");
}
