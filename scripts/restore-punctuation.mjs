#!/usr/bin/env node
/**
 * Restore the punctuation of Serpentine's poem corpus from source texts.
 *
 *   node scripts/restore-punctuation.mjs [--write] <source.txt>...
 *
 * The corpus in `src/games/serpentine/engine/puzzles.ts` was transcribed
 * by stripping punctuation, which is unrecoverable from the phrase
 * itself — "AWAY AWAY YOUR FLATTERING ARTS" holds no trace of the two
 * commas Byron wrote. So it is taken from the source, never guessed:
 *
 * 1. Reduce each source text to its letters, remembering where every
 *    letter sat in the original.
 * 2. Find each phrase's letter sequence in that reduction. A phrase that
 *    matches nowhere, or in two places that disagree, is left alone.
 * 3. Lift the source span the letters came from, keeping its marks, plus
 *    any sentence ender sitting just past the last letter.
 * 4. Assert the lifted span has exactly the phrase's letters, in order.
 *    Punctuation may not add, drop, or reorder a single grid cell.
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

function loadSources(paths) {
  return paths.map((p) => {
    const text = normalize(readFileSync(p, "utf8"));
    return { name: basename(p), text, ...lettersOf(text) };
  });
}

/**
 * Every distinct punctuated span in the sources that spells `phrase`.
 * More than one distinct result means the sources disagree, and the
 * phrase is not safe to rewrite.
 */
function candidates(sources, phrase) {
  const target = phrase.replace(/[^A-Z]/g, "");
  const found = new Set();
  for (const source of sources) {
    let at = source.letters.indexOf(target);
    while (at !== -1) {
      const from = source.offsets[at];
      const to = source.offsets[at + target.length - 1];
      // A phrase is usually an excerpt, so a trailing comma would dangle
      // — but a sentence ender belongs to the line and is kept.
      const ender = /^[.!?]/.exec(source.text.slice(to + 1));
      const span = cleanSpan(source.text.slice(from, to + 1 + (ender ? 1 : 0)));
      if (span.replace(/[^A-Z]/g, "") === target) found.add(span);
      at = source.letters.indexOf(target, at + 1);
    }
  }
  return [...found];
}

const args = process.argv.slice(2);
const write = args.includes("--write");
const sourcePaths = args.filter((a) => a !== "--write");
if (sourcePaths.length === 0) {
  console.error("usage: restore-punctuation.mjs [--write] <source.txt>...");
  process.exit(2);
}

const sources = loadSources(sourcePaths);
const corpus = readFileSync(CORPUS, "utf8");
// The phrase is the third string of a PoemEntry. Its class holds every
// mark the readout draws, so a run over an already-punctuated corpus
// re-derives the same spans instead of skipping them.
const ENTRY = /(\[\s*"(?:[^"\\]|\\.)*"\s*,\s*"(?:[^"\\]|\\.)*"\s*,\s*")([A-Z '\-—,.;:!?]+)("\s*\])/g;

const report = { restored: [], unchanged: 0, missing: [], ambiguous: [] };

const updated = corpus.replace(ENTRY, (all, head, phrase, tail) => {
  const spans = candidates(sources, phrase);
  if (spans.length === 0) {
    report.missing.push(phrase);
    return all;
  }
  if (spans.length > 1) {
    report.ambiguous.push({ phrase, spans });
    return all;
  }
  const [span] = spans;
  if (span === phrase) {
    report.unchanged++;
    return all;
  }
  report.restored.push({ from: phrase, to: span });
  return head + span + tail;
});

const total = report.restored.length + report.unchanged + report.missing.length + report.ambiguous.length;
console.log(`sources     ${sources.map((s) => s.name).join(", ")}`);
console.log(`phrases     ${total}`);
console.log(`restored    ${report.restored.length}`);
console.log(`unchanged   ${report.unchanged}`);
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
  console.log(`\nwrote ${report.restored.length} phrases to ${basename(CORPUS)}`);
} else {
  console.log("\ndry run — pass --write to apply");
}
