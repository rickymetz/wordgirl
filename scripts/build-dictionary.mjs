/**
 * One-off dictionary builder. Output is COMMITTED because daily puzzle
 * determinism depends on exact dictionary contents — rerunning this with
 * newer sources changes future dailies, so bump DICT_VERSION in
 * src/games/polygram/engine/dictionary.ts if you regenerate.
 *
 * Pipeline: ENABLE word list (validity) ∩ Norvig count_1w top-N (commonness),
 * lengths 3–10, a-z only, blocklist-filtered. Emits newline-separated,
 * sorted by length then alphabetically.
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
]);

// Words every puzzle player expects to count, whatever their subtitle
// frequency says — forced into the REQUIRED tier (must be in ENABLE).
const REQUIRED_ALLOWLIST = new Set(["ode", "odes", "tit", "tits", "dick"]);

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

const sortWords = (set) =>
  [...set].sort((a, b) => a.length - b.length || a.localeCompare(b));
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
