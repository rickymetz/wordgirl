/**
 * One-off dictionary builder. Output is COMMITTED because daily puzzle
 * determinism depends on exact dictionary contents — rerunning this with
 * newer sources changes future dailies, so bump DICT_VERSION in
 * src/lib/words/dictionary.ts if you regenerate.
 *
 * Pipeline:
 *   1. ENABLE word list (validity) ∩ subtitle-frequency top-N → core dict
 *   2. Suffix expansion: any ENABLE word whose base form is already in the
 *      dict gets added to the bonus tier, ensuring consistent inflection
 *      coverage (-s, -es, -ed, -ing, -ly, -er, -est).
 *
 * Usage: npm run build:dictionary
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const CACHE_DIR = new URL("./.cache/", import.meta.url).pathname;
const OUT_FILE = new URL(
  "../src/lib/words/dictionary.txt",
  import.meta.url,
).pathname;

const ENABLE_URL =
  "https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt";
// OpenSubtitles-derived frequency list, pre-sorted by descending frequency,
// "word count" per line. Conversational frequencies suit a casual game well.
const FREQ_URL =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt";

// Two tiers. REQUIRED words gate level advancement, so they must be
// common — this is the frustration dial. BONUS words score extra points
// but are never required (and never hinted), so they can be rarer.
// Bonus lines are prefixed "+" in the output.
const REQUIRED_TOP_N = 12_000;
const FREQ_TOP_N = 30_000;
const MIN_LEN = 3;
const MAX_LEN = 10;

// Words the game must never require the player to find (hints would
// literally spell these out). Small and hand-maintained on purpose.
const BLOCKLIST = new Set([
  "ass", "asses", "arse", "arses", "bastard", "bastards", "bitch",
  "bitches", "boob", "boobs", "cock", "cocks", "crap", "craps", "cunt",
  "cunts", "damn", "damns", "fag", "fags", "faggot",
  "faggots", "fuck", "fucks", "fucked", "fucker", "fuckers", "fucking",
  "hell", "hells", "homo", "homos", "jap", "japs", "jew", "jews", "kike",
  "kikes", "negro", "negros", "negroes", "nigger", "niggers", "piss",
  "pissed", "pisses", "prick", "pricks", "pussy", "pussies", "shit",
  "shits", "shitted", "slut", "sluts", "spic", "spics",
  "twat", "twats", "wank", "wanks", "whore", "whores", "whoring",
  // Violence/abuse — the game must never require these via hints.
  "rape", "raped", "rapes", "raping", "rapist", "rapists", "incest",
  "molest", "molests", "molested", "molester", "molesters", "pedophile",
  "pedophiles", "pederast", "pederasts", "retard", "retards", "retarded",
  // Dialect/transcription junk that slips in via subtitle frequencies.
  "oot", "sha", "hah", "heh", "duh", "ugh", "umm", "hmm", "shh", "psst",
  "brr", "tsk", "pff", "eek", "erm",
  // Names and subtitle artifacts that read as non-words when a puzzle
  // REQUIRES them (they're in ENABLE, but nobody thinks of them).
  "mel", "del", "sal", "mae", "kat", "goa", "lakhs", "riley", "sally",
  "donna", "jones", "sonny", "monte",
  // More of the same, surfaced by backwords: its mirror rows CELEBRATE
  // both readings, so junk reversals (eat|tae, man|nam, bed|deb,
  // map|pam, sit|tis) and name-palindromes (ana) teach non-words.
  "tae", "nam", "deb", "pam", "tis", "ana",
]);

// Words every puzzle player expects to count, whatever their subtitle
// frequency says — forced into the REQUIRED tier (must be in ENABLE).
const REQUIRED_ALLOWLIST = new Set([
  "ode", "odes", "tit", "tits", "dick",
  // Everyday concrete words the subtitle corpus underrates — players
  // type these and deserve a yes.
  "munch", "stomp", "stung", "stout", "stoop", "ore", "bog", "oar",
  "eel", "elm", "imp", "orb", "urn", "yolk", "mime", "ewe", "husk",
  "stoic",
  // Mirror-word staples: backwords rows need BOTH readings in the
  // required tier, and these reversals are words players expect.
  "dab",
]);

/**
 * Given an inflected word, return candidate base forms by stripping
 * common English suffixes. We don't need perfect morphology — false
 * candidates that aren't in ENABLE or our dict are harmlessly ignored.
 */
function candidateBases(word) {
  const bases = new Set();
  const len = word.length;

  // -s / -es / -ies plurals
  if (word.endsWith("s") && !word.endsWith("ss") && len > MIN_LEN) {
    bases.add(word.slice(0, -1));
  }
  if (word.endsWith("es") && len > MIN_LEN + 1) {
    bases.add(word.slice(0, -2));
  }
  if (word.endsWith("ies") && len > MIN_LEN + 2) {
    bases.add(word.slice(0, -3) + "y");
  }

  // -ed: walked→walk, baked→bake (drop d), penned→pen (doubled cons)
  if (word.endsWith("ed") && len > MIN_LEN + 1) {
    const stemEd = word.slice(0, -2);
    bases.add(stemEd);
    bases.add(stemEd + "e");
    if (
      stemEd.length >= MIN_LEN &&
      stemEd[stemEd.length - 1] === stemEd[stemEd.length - 2]
    ) {
      bases.add(stemEd.slice(0, -1));
    }
    if (word.endsWith("ied") && len > MIN_LEN + 2) {
      bases.add(word.slice(0, -3) + "y");
    }
  }

  // -ing: walking→walk, baking→bake, running→run
  if (word.endsWith("ing") && len > MIN_LEN + 2) {
    const stemIng = word.slice(0, -3);
    bases.add(stemIng);
    bases.add(stemIng + "e");
    if (
      stemIng.length >= MIN_LEN &&
      stemIng[stemIng.length - 1] === stemIng[stemIng.length - 2]
    ) {
      bases.add(stemIng.slice(0, -1));
    }
  }

  // -ly: quickly→quick, happily→happy
  if (word.endsWith("ly") && len > MIN_LEN + 1) {
    bases.add(word.slice(0, -2));
    if (word.endsWith("ily") && len > MIN_LEN + 2) {
      bases.add(word.slice(0, -3) + "y");
    }
  }

  // -er: taller→tall, baker→bake, runner→run, happier→happy
  if (word.endsWith("er") && len > MIN_LEN + 1) {
    const stemEr = word.slice(0, -2);
    bases.add(stemEr);
    bases.add(stemEr + "e");
    if (
      stemEr.length >= MIN_LEN &&
      stemEr[stemEr.length - 1] === stemEr[stemEr.length - 2]
    ) {
      bases.add(stemEr.slice(0, -1));
    }
    if (word.endsWith("ier") && len > MIN_LEN + 2) {
      bases.add(word.slice(0, -3) + "y");
    }
  }

  // -est: tallest→tall, nicest→nice, biggest→big, happiest→happy
  if (word.endsWith("est") && len > MIN_LEN + 2) {
    const stemEst = word.slice(0, -3);
    bases.add(stemEst);
    bases.add(stemEst + "e");
    if (
      stemEst.length >= MIN_LEN &&
      stemEst[stemEst.length - 1] === stemEst[stemEst.length - 2]
    ) {
      bases.add(stemEst.slice(0, -1));
    }
    if (word.endsWith("iest") && len > MIN_LEN + 3) {
      bases.add(word.slice(0, -4) + "y");
    }
  }

  // -ness: sadness→sad, kindness→kind
  if (word.endsWith("ness") && len > MIN_LEN + 3) {
    bases.add(word.slice(0, -4));
    if (word.endsWith("iness") && len > MIN_LEN + 4) {
      bases.add(word.slice(0, -5) + "y");
    }
  }

  return bases;
}

async function fetchCached(url, name) {
  const cachePath = path.join(CACHE_DIR, name);
  if (existsSync(cachePath)) {
    console.log(`using cached ${name}`);
    return readFile(cachePath, "utf8");
  }
  console.log(`downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const text = await res.text();
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cachePath, text);
  return text;
}

const [enableRaw, freqRaw] = await Promise.all([
  fetchCached(ENABLE_URL, "enable1.txt"),
  fetchCached(FREQ_URL, "count_1w.txt"),
]);

const enable = new Set(
  enableRaw
    .split(/\r?\n/)
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean),
);
console.log(`ENABLE: ${enable.size} words`);

// Frequency file is sorted by descending frequency: "word count" per line.
const required = new Set();
const bonus = new Set();
let rank = 0;
for (const line of freqRaw.split(/\r?\n/)) {
  if (rank >= FREQ_TOP_N) break;
  const word = line.split(/[\s\t]/)[0]?.trim().toLowerCase();
  if (!word) continue;
  rank++;
  if (word.length < MIN_LEN || word.length > MAX_LEN) continue;
  if (!/^[a-z]+$/.test(word)) continue;
  if (!enable.has(word)) continue;
  if (BLOCKLIST.has(word)) continue;
  (rank <= REQUIRED_TOP_N ? required : bonus).add(word);
}

for (const word of REQUIRED_ALLOWLIST) {
  if (!enable.has(word) || BLOCKLIST.has(word)) continue;
  bonus.delete(word);
  required.add(word);
}

// --- Suffix expansion ---
// For every ENABLE word whose base form (after stripping a common suffix)
// is already in our dictionary, add the inflected form to the bonus tier.
// This ensures consistent coverage: if "pen" is required, "penned",
// "penning", "pens" all count as bonus words.
const allDict = new Set([...required, ...bonus]);
let suffixAdded = 0;
for (const word of enable) {
  if (word.length < MIN_LEN || word.length > MAX_LEN) continue;
  if (!/^[a-z]+$/.test(word)) continue;
  if (allDict.has(word)) continue;
  if (BLOCKLIST.has(word)) continue;

  const bases = candidateBases(word);
  for (const base of bases) {
    if (allDict.has(base)) {
      bonus.add(word);
      allDict.add(word);
      suffixAdded++;
      break;
    }
  }
}
console.log(`suffix expansion: +${suffixAdded} bonus words`);

// Group by length but KEEP frequency order inside each group (Set
// iteration = insertion = rank order; JS sort is stable): a word's
// position in its bucket is its difficulty, read at runtime.
const sortWords = (set) => [...set].sort((a, b) => a.length - b.length);
const requiredWords = sortWords(required);
const bonusWords = sortWords(bonus);

const byLen = {};
for (const w of requiredWords) byLen[w.length] = (byLen[w.length] ?? 0) + 1;
console.log(`required ${requiredWords.length}`, byLen);
console.log(`bonus ${bonusWords.length}`);

await mkdir(path.dirname(OUT_FILE), { recursive: true });
await writeFile(
  OUT_FILE,
  requiredWords.join("\n") +
    "\n" +
    bonusWords.map((w) => `+${w}`).join("\n") +
    "\n",
);
console.log(`wrote ${OUT_FILE}`);
