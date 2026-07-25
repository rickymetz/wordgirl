import { seededRandom } from "../../../lib/random";
import type { Cell, Difficulty, PuzzleDef } from "./types";
import { MAX_ROWS, MAX_COLS, cellKey, areAdjacent } from "./types";

/**
 * Poetry entries for Serpentine puzzles, grouped by theme.
 *
 * HAIKU: 76 verified public-domain translations of haiku by Basho,
 * Issa, Buson, Chiyo, Shiki, Kikaku, and Hokushi. English translations
 * cross-referenced against kana-dojo (github.com/lingdojo/kana-dojo)
 * and standard haiku anthologies.
 *
 * ENGLISH: 414 verified public-domain poem lines sourced from
 * GitHub poetry datasets: le-recital (Shelley, Keats, Shakespeare,
 * Blake, Wordsworth, Rossetti), BadPoets (Dickinson), and
 * Lord-Generator (Byron).
 *
 * Each day selects a theme, then independently picks a haiku and poem
 * from that theme. On repeat the same theme appears but with a different
 * haiku+poem combination and a fresh grid layout.
 *
 * Phrases are uppercase A–Z plus the poet's typography: a space between
 * words, and any of ' - — , . ; : ! ? where the poem has one. None of it
 * reaches the grid — `expand` keeps only the letters — but the readout
 * above the board draws all of it, so a phrase must never run two words
 * together where the source had a dash between them. `corpus.test.ts`
 * guards that.
 *
 * The transcription that produced these phrases had stripped every mark.
 * They were put back by `scripts/restore-punctuation.mjs`, which finds a
 * phrase's letters inside the source text and lifts the span they came
 * from — 431 of the 490 phrases, each asserted to keep exactly its own
 * letters in order. The 58 unmatched are haiku translations absent from
 * the sources, plus one Byron variant; a phrase whose sources disagree
 * is left alone. Punctuation here is lifted, never remembered: re-run
 * the script rather than editing a mark by hand.
 *
 * That same search sets the excerpt flag — a phrase shorter than the
 * poem holding it is a cut from it, and the game says "from" before the
 * title. 412 English lines are excerpts; every haiku is whole.
 */
/**
 * `[author, title, phrase]`, plus `true` when the phrase is only part of
 * that poem. Whole poems — nearly all the haiku — carry no flag, so the
 * common case stays a three-element row.
 */
type PoemEntry = [string, string, string, boolean?];

interface ThemeGroup {
  theme: string;
  haiku: PoemEntry[];
  english: PoemEntry[];
}

export function bestGrid(n: number): [number, number] {
  let best: [number, number] | null = null;
  let bestScore = Infinity;
  for (let r = 3; r <= MAX_ROWS; r++) {
    for (let c = 3; c <= MAX_COLS; c++) {
      const total = r * c;
      if (total < n) continue;
      const waste = total - n;
      const skew = Math.abs(r - c);
      const score = waste * 10 + skew;
      if (score < bestScore) { bestScore = score; best = [r, c]; }
    }
  }
  return best ?? [3, 3];
}

export function isConnected(rows: number, cols: number, blocked: Set<string>): boolean {
  let start: Cell | null = null;
  let liveCount = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!blocked.has(cellKey({ row: r, col: c }))) {
        if (!start) start = { row: r, col: c };
        liveCount++;
      }
    }
  }
  if (!start || liveCount <= 1) return true;

  const visited = new Set<string>();
  const queue: Cell[] = [start];
  visited.add(cellKey(start));
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r2 = cur.row + dr;
        const c2 = cur.col + dc;
        if (r2 < 0 || r2 >= rows || c2 < 0 || c2 >= cols) continue;
        const key = cellKey({ row: r2, col: c2 });
        if (!blocked.has(key) && !visited.has(key)) {
          visited.add(key);
          queue.push({ row: r2, col: c2 });
        }
      }
    }
  }
  return visited.size === liveCount;
}

export function pickBlocked(
  rows: number,
  cols: number,
  n: number,
  rand: () => number,
): Set<string> {
  const total = rows * cols;
  const toRemove = total - n;
  if (toRemove <= 0) return new Set();

  for (let attempt = 0; attempt < 50; attempt++) {
    const corners: Cell[] = [];
    const edges: Cell[] = [];
    const interior: Cell[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isEdge =
          r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
        const isCorner =
          (r === 0 || r === rows - 1) && (c === 0 || c === cols - 1);
        if (isCorner) corners.push({ row: r, col: c });
        else if (isEdge) edges.push({ row: r, col: c });
        else interior.push({ row: r, col: c });
      }
    }

    for (const arr of [corners, edges, interior]) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }

    const candidates = [...corners, ...edges, ...interior];
    const blocked = new Set<string>();
    for (const c of candidates) {
      if (blocked.size >= toRemove) break;
      blocked.add(cellKey(c));
    }

    if (isConnected(rows, cols, blocked)) {
      return blocked;
    }
  }

  return new Set();
}

function hamiltonianPath(
  rows: number,
  cols: number,
  blocked: Set<string>,
  rand: () => number,
): Cell[] {
  const total = rows * cols - blocked.size;

  function getNeighbors(row: number, col: number): Cell[] {
    const out: Cell[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r2 = row + dr;
        const c2 = col + dc;
        if (r2 >= 0 && r2 < rows && c2 >= 0 && c2 < cols) {
          if (!blocked.has(cellKey({ row: r2, col: c2 }))) {
            out.push({ row: r2, col: c2 });
          }
        }
      }
    }
    return out;
  }

  const liveCells: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!blocked.has(cellKey({ row: r, col: c }))) {
        liveCells.push({ row: r, col: c });
      }
    }
  }

  function attempt(): Cell[] | null {
    const visited = Array.from({ length: rows }, () =>
      new Array<boolean>(cols).fill(false),
    );
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (blocked.has(cellKey({ row: r, col: c }))) {
          visited[r][c] = true;
        }
      }
    }

    const start = liveCells[Math.floor(rand() * liveCells.length)];
    visited[start.row][start.col] = true;
    const path: Cell[] = [start];

    while (path.length < total) {
      const tail = path[path.length - 1];
      const nexts = getNeighbors(tail.row, tail.col).filter(
        (n) => !visited[n.row][n.col],
      );
      if (nexts.length === 0) return null;

      let bestScore = Infinity;
      const scored: { cell: Cell; score: number }[] = [];
      for (const n of nexts) {
        let free = 0;
        for (const nn of getNeighbors(n.row, n.col)) {
          if (!visited[nn.row][nn.col]) free++;
        }
        scored.push({ cell: n, score: free });
        if (free < bestScore) bestScore = free;
      }

      const best = scored.filter((s) => s.score === bestScore);
      const pick = best[Math.floor(rand() * best.length)].cell;
      visited[pick.row][pick.col] = true;
      path.push(pick);
    }
    return path;
  }

  for (let i = 0; i < 200; i++) {
    const result = attempt();
    if (result) return result;
  }

  const fallback: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    const rowCells: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      if (!blocked.has(cellKey({ row: r, col: c }))) {
        rowCells.push({ row: r, col: c });
      }
    }
    if (r % 2 === 1) rowCells.reverse();
    fallback.push(...rowCells);
  }
  for (let i = 1; i < fallback.length; i++) {
    if (!areAdjacent(fallback[i - 1], fallback[i])) {
      throw new Error(
        `Hamiltonian path failed after 200 attempts and fallback is non-contiguous at ${cellKey(fallback[i - 1])} → ${cellKey(fallback[i])}`,
      );
    }
  }
  return fallback;
}

function expand(
  author: string,
  title: string,
  text: string,
  id: string,
  difficulty: Difficulty,
  rand: () => number,
  excerpt: boolean,
): PuzzleDef {
  const letters = text.replace(/[^A-Z]/g, "");
  const [rows, cols] = bestGrid(letters.length);
  const blocked = pickBlocked(rows, cols, letters.length, rand);
  const path = hamiltonianPath(rows, cols, blocked, rand);
  const grid: string[][] = Array.from({ length: rows }, () =>
    new Array<string>(cols).fill(""),
  );
  for (let i = 0; i < path.length; i++) {
    grid[path[i].row][path[i].col] = letters[i];
  }
  return { id, title, author, difficulty, rows, cols, grid, text, path, blocked, excerpt };
}

// --- Themed poetry pools ---

const THEME_POOLS: ThemeGroup[] = [
  {
    theme: "water",
    haiku: [
    ["Basho", "Old Pond", "AN OLD POND; A FROG JUMPS IN; THE SOUND OF WATER."],
    ["Basho", "Old Pond", "THE OLD POND; A FROG JUMPS IN— THE SOUND OF WATER."],
    ["Basho", "Mogami River", "GATHERING SUMMER RAINS, THE MOGAMI RIVER RUSHES ON."],
    ["Buson", "Spring Sea", "THE SPRING SEA STRETCHES LAZILY ALL DAY, RISING AND FALLING."],
    ["Basho", "Sea Darkening", "THE SEA DARKENING THE VOICES OF THE WILD DUCKS FAINTLY WHITE"],
    ["Basho", "Frog", "OLD POND FROGS JUMPING IN SOUND OF WATER"],
    ["Buson", "Spring", "THE SPRING SEA RISING AND FALLING RISING AND FALLING ALL DAY"],
    ["Buson", "Willow", "UNDER THE WILLOW THE STREAM PAUSES IN THE TWILIGHT"],
    ],
    english: [
    ["Byron", "Sonnet on the Nuptials of the Marquis Antonio Cavalli With the Countess Clelia Rasponi of Ravenna", "A NOBLE LADY OF THE ITALIAN SHORE", true],
    ["Byron", "Oh! Weep for Those", "OH! WEEP FOR THOSE THAT WEPT BY BABEL'S STREAM", true],
    ["Byron", "Song for the Luddites", "AS THE LIBERTY LADS O'ER THE SEA", true],
    ["Dickinson", "The pretty Rain from those sweet Eaves", "THE PRETTY RAIN FROM THOSE SWEET EAVES", true],
    ["Dickinson", "I think that the Root of the Wind is Water --", "I THINK THAT THE ROOT OF THE WIND IS WATER", true],
    ["Dickinson", "A soft Sea washed around the House", "A SOFT SEA WASHED AROUND THE HOUSE", true],
    ["Dickinson", "The Moon is distant from the Sea", "THE MOON IS DISTANT FROM THE SEA", true],
    ["Dickinson", "Our little Kinsmen -- after Rain", "OUR LITTLE KINSMEN— AFTER RAIN", true],
    ["Dickinson", "Like Rain it sounded till it curved", "LIKE RAIN IT SOUNDED TILL IT CURVED", true],
    ["Dickinson", "Our little Kinsmen -- after Rain", "OUR LITTLE KINSMEN— AFTER RAIN IN PLENTY MAY BE SEEN", true],
    ["Byron", "Song for the Luddites", "AS THE LIBERTY LADS O'ER THE SEA BOUGHT THEIR FREEDOM, AND CHEAPLY, WITH BLOOD", true],
    ["Dickinson", "A Drop Fell on the Apple Tree --", "A DROP FELL ON THE APPLE TREE— ANOTHER— ON THE ROOF", true],
    ["Dickinson", "Nature and God -- I neither knew", "NATURE AND GOD— I NEITHER KNEW YET BOTH SO WELL KNEW ME", true],
    ["Dickinson", "Water makes many Beds", "WATER MAKES MANY BEDS FOR THOSE AVERSE TO SLEEP", true],
    ["Dickinson", "The Sea said \"Come\" to the Brook --", "THE SEA SAID COME TO THE BROOK— THE BROOK SAID LET ME GROW", true],
    ["Byron", "Sonnet on the Nuptials of the Marquis Antonio Cavalli With the Countess Clelia Rasponi of Ravenna", "A NOBLE LADY OF THE ITALIAN SHORE LOVELY AND YOUNG, HERSELF A HAPPY BRIDE", true],
    ["Byron", "Translation of the Nurse's Dole in the _Medea_ of Euripides", "OH HOW I WISH THAT AN EMBARGO HAD KEPT IN PORT THE GOOD SHIP ARGO!", true],
    ["Dickinson", "I started Early -- Took my Dog --", "I STARTED EARLY— TOOK MY DOG— AND VISITED THE SEA— THE MERMAIDS IN THE BASEMENT", true],
    ["Dickinson", "I think that the Root of the Wind is Water --", "I THINK THAT THE ROOT OF THE WIND IS WATER— IT WOULD NOT SOUND SO DEEP", true],
    ["Byron", "To---", "OH! WELL I KNOW YOUR SUBTLE SEX, FRAIL DAUGHTERS OF THE WANTON EVE", true],
    ["Dickinson", "The Moon is distant from the Sea", "THE MOON IS DISTANT FROM THE SEA— AND YET, WITH AMBER HANDS", true],
    ["Dickinson", "My Garden -- like the Beach", "MY GARDEN— LIKE THE BEACH— DENOTES THERE BE— A SEA", true],
    ["Byron", "To Thomas Moore", "MY BOAT IS ON THE SHORE, AND MY BARK IS ON THE SEA; BUT, BEFORE I GO, TOM MOORE", true],
    ["Byron", "To Thomas Moore", "MY BOAT IS ON THE SHORE, AND MY BARK IS ON THE SEA", true],
    ["Byron", "Aristomenes", "CANTO FIRST. THE GODS OF OLD ARE SILENT ON THE SHORE.", true],
    ["Byron", "Remember Thee! Remember Thee!", "REMEMBER THEE! REMEMBER THEE! TILL LETHE QUENCH LIFE'S BURNING STREAM", true],
    ["Rossetti", "A Birthday", "MY HEART IS LIKE A SINGING BIRD WHOSE NEST IS IN A WATER'D SHOOT", true],
    ["Byron", "Versicles", "I READ THE CHRISTABEL; VERY WELL", true],
    ["Byron", "My Soul Is Dark", "MY SOUL IS DARK—OH! QUICKLY STRING THE HARP I YET CAN BROOK TO HEAR", true],
    ["Byron", "Versicles", "I READ THE CHRISTABEL; VERY WELL: I READ THE MISSIONARY", true],
    ["Byron", "Epigram", "IN DIGGING UP YOUR BONES, TOM PAINE, WILL. COBBETT HAS DONE WELL", true],
    ["Keats", "To Autumn", "STEADY THY LADEN HEAD ACROSS A BROOK", true],
    ["Keats", "To Autumn", "AMONG THE RIVER SALLOWS, BORNE ALOFT", true],
    ["Keats", "Ode on a Grecian Urn", "WHAT LITTLE TOWN BY RIVER OR SEA SHORE", true],
    ["Shelley", "Ozymandias", "TELL THAT ITS SCULPTOR WELL THOSE PASSIONS READ", true],
    ["Shakespeare", "Sonnet 73 (That time of year thou mayst in me behold)", "TO LOVE THAT WELL, WHICH THOU MUST LEAVE ERE LONG.", true],
    ["Wordsworth", "I Wandered Lonely as a Cloud", "BESIDE THE LAKE, BENEATH THE TREES", true],
    ["Shakespeare", "Sonnet 130 (My mistress' eyes are nothing like the sun)", "I LOVE TO HEAR HER SPEAK, YET WELL I KNOW", true],
    ["Rossetti", "A Birthday", "WHOSE NEST IS IN A WATER'D SHOOT", true],
    ["Rossetti", "A Birthday", "MY HEART IS LIKE A RAINBOW SHELL THAT PADDLES IN A HALCYON SEA", true],
    ["Rossetti", "A Birthday", "WHOSE NEST IS IN A WATER'D SHOOT; MY HEART IS LIKE AN APPLE-TREE", true],
    ["Blake", "The Lamb", "BY THE STREAM AND O'ER THE MEAD; GAVE THEE CLOTHING OF DELIGHT", true],
    ["Blake", "The Lamb", "GAVE THEE LIFE, AND BID THEE FEED BY THE STREAM AND O'ER THE MEAD", true],
    ["Rossetti", "A Birthday", "THAT PADDLES IN A HALCYON SEA; MY HEART IS GLADDER THAN ALL THESE", true],
    ["Keats", "To Autumn", "STEADY THY LADEN HEAD ACROSS A BROOK; OR BY A CYDER-PRESS, WITH PATIENT LOOK", true],
    ["Wordsworth", "I Wandered Lonely as a Cloud", "BESIDE THE LAKE, BENEATH THE TREES, FLUTTERING AND DANCING IN THE BREEZE.", true],
    ["Wordsworth", "I Wandered Lonely as a Cloud", "A HOST, OF GOLDEN DAFFODILS; BESIDE THE LAKE, BENEATH THE TREES", true],
    ],
  },
  {
    theme: "creatures",
    haiku: [
    ["Issa", "Sparrows", "LITTLE SPARROWS, MOVE ASIDE, THE HORSE IS COMING THROUGH."],
    ["Issa", "Skinny Frog", "SKINNY FROG, DON'T GIVE UP! ISSA IS HERE WITH YOU."],
    ["Basho", "Withered Branch", "ON A WITHERED BRANCH, A CROW HAS SETTLED— AUTUMN NIGHTFALL."],
    ["Basho", "Cicada Stillness", "SUCH STILLNESS— THE CRIES OF THE CICADAS SINK INTO THE ROCKS."],
    ["Basho", "Cicada Voice", "NOTHING IN THE CICADA'S VOICE GIVES TOKEN OF A SPEEDY DEATH"],
    ["Basho", "Stillness And Cicada", "STILLNESS PENETRATING THE ROCKS THE VOICE OF THE LOCUST"],
    ["Kikaku", "Fallen Flower", "A FALLEN FLOWER FLEW BACK TO ITS BRANCH NO IT WAS A BUTTERFLY"],
    ["Issa", "Snail", "LITTLE SNAIL SLOWLY SLOWLY CLIMB UP FUJIYAMA"],
    ["Basho", "Firefly", "COME COME THOUGH I CRY THE FIREFLY GOES ITS WAY"],
    ["Issa", "Firefly", "FIREFLY THAT WAY THAT WAY THIS WAY THAT WAY THAT WAY THIS WAY"],
    ["Issa", "Sparrow", "COME AND PLAY WITH ME FATHERLESS SPARROW"],
    ["Kikaku", "Firefly", "A FIREFLY FLEW FROM MY FINGERS INTO THE DARK"],
    ["Basho", "Skylark", "A SKYLARK SINGING NOTHING ELSE IN THE FIELDS"],
    ["Basho", "Silence And Rocks", "OH HOW STILL THE VOICE OF THE CICADA SINKS INTO THE ROCKS"],
    ["Basho", "Butterfly", "ASLEEP UPON THE TEMPLE BELL THE BUTTERFLY"],
    ["Buson", "Evening", "ON THE TEMPLE BELL SETTLED AND SLEEPING A BUTTERFLY"],
    ["Basho", "Stillness And Locust", "HOW STILL IT IS STINGING INTO THE STONES THE LOCUSTS TRILL"],
    ],
    english: [
    ["Dickinson", "Split the Lark -- and you'll find the Music --", "SPLIT THE LARK— AND YOU'LL FIND THE MUSIC", true],
    ["Dickinson", "The Bird her punctual music brings", "THE BIRD HER PUNCTUAL MUSIC BRINGS", true],
    ["Dickinson", "The Butterfly in honored Dust", "THE BUTTERFLY IN HONORED DUST", true],
    ["Rossetti", "A Birthday", "MY HEART IS LIKE A SINGING BIRD", true],
    ["Dickinson", "From Cocoon forth a Butterfly", "FROM COCOON FORTH A BUTTERFLY", true],
    ["Dickinson", "A little Dog that wags his tail", "A LITTLE DOG THAT WAGS HIS TAIL", true],
    ["Dickinson", "The Butterfly's Numidian Gown", "THE BUTTERFLY'S NUMIDIAN GOWN", true],
    ["Dickinson", "The Flower must not blame the Bee", "THE FLOWER MUST NOT BLAME THE BEE", true],
    ["Dickinson", "The Butterfly's Assumption Gown", "THE BUTTERFLY'S ASSUMPTION GOWN", true],
    ["Dickinson", "The Butterfly in honored Dust", "THE BUTTERFLY IN HONORED DUST ASSUREDLY WILL LIE", true],
    ["Dickinson", "The Butterfly upon the Sky,", "THE BUTTERFLY UPON THE SKY, THAT DOESN'T KNOW ITS NAME AND HASN'T ANY TAX TO PAY", true],
    ["Dickinson", "\"Nature\" is what we see --", "NATURE IS WHAT WE SEE— THE HILL— THE AFTERNOON— SQUIRREL— ECLIPSE— THE BUMBLE BEE", true],
    ["Dickinson", "I have a Bird in spring", "I HAVE A BIRD IN SPRING WHICH FOR MYSELF DOTH SING— THE SPRING DECOYS.", true],
    ["Dickinson", "An Antiquated Tree", "AN ANTIQUATED TREE IS CHERISHED OF THE CROW", true],
    ["Dickinson", "The butterfly obtains", "THE BUTTERFLY OBTAINS BUT LITTLE SYMPATHY", true],
    ["Dickinson", "To flee from memory", "TO FLEE FROM MEMORY HAD WE THE WINGS MANY WOULD FLY", true],
    ["Blake", "The Lamb", "LITTLE LAMB WHO MADE THEE DOST THOU KNOW WHO MADE THEE"],
    ["Shakespeare", "Sonnet 29 (When in disgrace with fortune and men's eyes)", "LIKE TO THE LARK AT BREAK OF DAY ARISING", true],
    ["Byron", "Oh! Weep for Those", "THE WILD-DOVE HATH HER NEST, THE FOX HIS CAVE", true],
    ["Byron", "Translation", "WILT THOU, NOW, WING THY DISTANT FLIGHT?", true],
    ["Byron", "A Spirit Passed Before Me.  From Job", "THE MOTH SURVIVES YOU, AND ARE YE MORE JUST?", true],
    ["Byron", "Last Words on Greece", "TO THE POOR BIRD WHOSE PINION FLUTTERING DOWN", true],
    ["Byron", "She Walks in Beauty", "WHICH WAVES IN EVERY RAVEN TRESS", true],
    ["Byron", "Stanzas for Music", "WE WILL PART, WE WILL FLY TO—UNITE IT AGAIN!", true],
    ["Byron", "Versicles", "I READ GLENARVON, TOO, BY CARO LAMB", true],
    ["Byron", "The Conquest", "NOT FANNED ALONE BY VICTORY'S FLEETING WING", true],
    ["Blake", "The Tyger", "DID HE WHO MADE THE LAMB MAKE THEE?", true],
    ["Byron", "Answer to the Foregoing, Addressed to Miss----", "AH! FLY NOT FROM THE CANDID YOUTH", true],
    ["Blake", "The Lamb", "LITTLE LAMB, GOD BLESS THEE! LITTLE LAMB, GOD BLESS THEE!", true],
    ["Byron", "Translation", "WILT THOU, NOW, WING THY DISTANT FLIGHT? NO MORE WITH WONTED HUMOUR GAY", true],
    ["Byron", "To Mr. Murray", "WHICH IS NOT FAIRLY TO BEHAVE, MY MURRAY! BECAUSE IF A LIVE DOG, 'T IS SAID", true],
    ["Blake", "The Lamb", "WE ARE CALLED BY HIS NAME. LITTLE LAMB, GOD BLESS THEE!", true],
    ["Blake", "The Lamb", "I A CHILD, AND THOU A LAMB, WE ARE CALLED BY HIS NAME.", true],
    ["Byron", "To Mr. Murray", "MY MURRAY! BECAUSE IF A LIVE DOG, 'T IS SAID, BE WORTH A LION FAIRLY SPED", true],
    ["Blake", "The Lamb", "HE BECAME A LITTLE CHILD. I A CHILD, AND THOU A LAMB, WE ARE CALLED BY HIS NAME.", true],
    ["Blake", "The Lamb", "HE IS CALLED BY THY NAME, FOR HE CALLS HIMSELF A LAMB", true],
    ["Blake", "The Lamb", "LITTLE LAMB, I'LL TELL THEE: HE IS CALLED BY THY NAME, FOR HE CALLS HIMSELF A LAMB", true],
    ["Blake", "The Lamb", "HE IS MEEK, AND HE IS MILD, HE BECAME A LITTLE CHILD. I A CHILD, AND THOU A LAMB", true],
    ["Byron", "Answer to the Foregoing, Addressed to Miss----", "BELIEVE ME, ONLY DOES HIS DUTY: AH! FLY NOT FROM THE CANDID YOUTH", true],
    ["Blake", "The Lamb", "LITTLE LAMB, I'LL TELL THEE; LITTLE LAMB, I'LL TELL THEE", true],
    ["Blake", "The Lamb", "FOR HE CALLS HIMSELF A LAMB HE IS MEEK, AND HE IS MILD, HE BECAME A LITTLE CHILD.", true],
    ["Byron", "Versicles", "HILLO! I READ GLENARVON, TOO, BY CARO LAMB; GOD DAMN!", true],
    ["Blake", "The Lamb", "HE IS CALLED BY THY NAME, FOR HE CALLS HIMSELF A LAMB HE IS MEEK, AND HE IS MILD", true],
    ["Blake", "The Lamb", "MAKING ALL THE VALES REJOICE? LITTLE LAMB, WHO MADE THEE?", true],
    ["Shakespeare", "Sonnet 29 (When in disgrace with fortune and men's eyes)", "HAPLY I THINK ON THEE,— AND THEN MY STATE, LIKE TO THE LARK AT BREAK OF DAY ARISING", true],
    ["Byron", "Translation", "TO WHAT UNKNOWN REGION BORNE, WILT THOU, NOW, WING THY DISTANT FLIGHT?", true],
    ["Blake", "The Lamb", "LITTLE LAMB, I'LL TELL THEE: HE IS CALLED BY THY NAME", true],
    ["Blake", "The Lamb", "FOR HE CALLS HIMSELF A LAMB HE IS MEEK, AND HE IS MILD", true],
    ],
  },
  {
    theme: "sky",
    haiku: [
    ["Issa", "Harvest Moon", "A CHILD CRIES, ASKING ME TO FETCH THE HARVEST MOON."],
    ["Basho", "Moonlight", "FOR A WHILE, MOONLIGHT RESTS ABOVE THE BLOSSOMS."],
    ["Basho", "Harvest Moon", "THE HARVEST MOON; I WANDER AROUND THE POND ALL NIGHT LONG."],
    ["Basho", "Rough Sea", "A ROUGH SEA AND STRETCHING OVER SADO THE MILKY WAY"],
    ["Kikaku", "Harvest Moon", "AUTUMN'S FULL MOON LO THE SHADOWS OF A PINE-TREE UPON THE MATS"],
    ["Basho", "Lightning", "LIGHTNING AND INTO THE DARKNESS THE CRY OF A HERON"],
    ["Basho", "Rough Sea", "A ROUGH SEA AND THE MILKY WAY STRETCHING ACROSS TO SADO'S ISLE"],
    ["Basho", "Autumn Moon", "THE MOON SWIFT-SPEEDING THE TREETOPS HOLDING THE RAINDROPS"],
    ["Issa", "Mosquito", "THE MOSQUITO NET HOW FAR OFF IT HAS PUSHED THE STARS"],
    ],
    english: [
    ["Dickinson", "So much of Heaven has gone from Earth", "SO MUCH OF HEAVEN HAS GONE FROM EARTH", true],
    ["Dickinson", "Except to Heaven, she is nought.", "EXCEPT TO HEAVEN, SHE IS NOUGHT.", true],
    ["Byron", "Stanzas for Music", "BRIGHT BE THE PLACE OF THY SOUL!", true],
    ["Dickinson", "As Children bid the Guest \"Good Night\"", "AS CHILDREN BID THE GUEST GOOD NIGHT", true],
    ["Byron", "Written After Swimming From Sestos to Abydos", "IF, IN THE MONTH OF DARK DECEMBER", true],
    ["Dickinson", "Who has not found the Heaven -- below --", "WHO HAS NOT FOUND THE HEAVEN— BELOW", true],
    ["Dickinson", "Their Height in Heaven comforts not --", "THEIR HEIGHT IN HEAVEN COMFORTS NOT", true],
    ["Dickinson", "Through the Dark Sod -- as Education", "THROUGH THE DARK SOD— AS EDUCATION", true],
    ["Dickinson", "The Sun and Moon must make their haste --", "THE SUN AND MOON MUST MAKE THEIR HASTE", true],
    ["Dickinson", "You know that Portrait in the Moon --", "YOU KNOW THAT PORTRAIT IN THE MOON", true],
    ["Shakespeare", "Sonnet 130 (My mistress' eyes are nothing like the sun)", "MY MISTRESS' EYES ARE NOTHING LIKE THE SUN", true],
    ["Byron", "Sun of the Sleepless!", "SUN OF THE SLEEPLESS! MELANCHOLY STAR!", true],
    ["Byron", "Song", "BREEZE OF THE NIGHT IN GENTLER SIGHS", true],
    ["Dickinson", "I watched the Moon around the House", "I WATCHED THE MOON AROUND THE HOUSE", true],
    ["Byron", "I Saw Thee Weep", "I SAW THEE WEEP—THE BIG BRIGHT TEAR", true],
    ["Dickinson", "Lightly stepped a yellow star", "LIGHTLY STEPPED A YELLOW STAR", true],
    ["Dickinson", "Why -- do they shut Me out of Heaven?", "WHY— DO THEY SHUT ME OUT OF HEAVEN?", true],
    ["Keats", "Bright Star", "BRIGHT STAR, WOULD I WERE STEADFAST AS THOU ART", true],
    ["Dickinson", "Not One by Heaven defrauded stay --", "NOT ONE BY HEAVEN DEFRAUDED STAY", true],
    ["Dickinson", "We grow accustomed to the Dark", "WE GROW ACCUSTOMED TO THE DARK", true],
    ["Dickinson", "His Heart was darker than the starless night", "HIS HEART WAS DARKER THAN THE STARLESS NIGHT", true],
    ["Byron", "She Walks in Beauty", "SHE WALKS IN BEAUTY, LIKE THE NIGHT", true],
    ["Dickinson", "Except the Heaven had come so near", "EXCEPT THE HEAVEN HAD COME SO NEAR", true],
    ["Byron", "My Soul Is Dark", "MY SOUL IS DARK—OH! QUICKLY STRING", true],
    ["Byron", "Stanzas for Music", "BRIGHT BE THE PLACE OF THY SOUL! NO LOVELIER SPIRIT THAN THINE", true],
    ["Byron", "The Harp the Monarch Minstrel Swept", "THE HARP THE MONARCH MINSTREL SWEPT, THE KING OF MEN, THE LOVED OF HEAVEN!", true],
    ["Byron", "So We'll Go No More a-Roving", "SO WE'LL GO NO MORE A-ROVING SO LATE INTO THE NIGHT", true],
    ["Byron", "She Walks in Beauty", "SHE WALKS IN BEAUTY, LIKE THE NIGHT OF CLOUDLESS CLIMES AND STARRY SKIES", true],
    ["Byron", "Song", "BREEZE OF THE NIGHT IN GENTLER SIGHS MORE SOFTLY MURMUR O'ER THE PILLOW", true],
    ["Byron", "I Saw Thee Weep", "I SAW THEE WEEP—THE BIG BRIGHT TEAR CAME O'ER THAT EYE OF BLUE", true],
    ["Wordsworth", "I Wandered Lonely as a Cloud", "I WANDERED LONELY AS A CLOUD THAT FLOATS ON HIGH O'ER VALES AND HILLS", true],
    ["Blake", "The Tyger", "TYGER, TYGER, BURNING BRIGHT IN THE FORESTS OF THE NIGHT", true],
    ["Byron", "Written After Swimming From Sestos to Abydos", "IF, IN THE MONTH OF DARK DECEMBER, LEANDER, WHO WAS NIGHTLY WONT", true],
    ["Byron", "Sun of the Sleepless!", "WHOSE TEARFUL BEAM GLOWS TREMULOUSLY FAR", true],
    ["Blake", "The Tyger", "AND WATERED HEAVEN WITH THEIR TEARS", true],
    ["Shakespeare", "Sonnet 29 (When in disgrace with fortune and men's eyes)", "AND TROUBLE DEAF HEAVEN WITH MY BOOTLESS CRIES", true],
    ["Keats", "To Autumn", "CLOSE BOSOM-FRIEND OF THE MATURING SUN", true],
    ["Shakespeare", "Sonnet 18 (Shall I compare thee to a summer's day?)", "SOMETIME TOO HOT THE EYE OF HEAVEN SHINES", true],
    ["Shakespeare", "Sonnet 29 (When in disgrace with fortune and men's eyes)", "FROM SULLEN EARTH, SINGS HYMNS AT HEAVEN'S GATE", true],
    ["Shakespeare", "Sonnet 73 (That time of year thou mayst in me behold)", "WHICH BY AND BY BLACK NIGHT DOTH TAKE AWAY", true],
    ["Shakespeare", "Sonnet 73 (That time of year thou mayst in me behold)", "IN ME THOU SEE'ST THE TWILIGHT OF SUCH DAY", true],
    ["Keats", "To Autumn", "OR SINKING AS THE LIGHT WIND LIVES OR DIES", true],
    ["Keats", "Bright Star", "NOT IN LONE SPLENDOUR HUNG ALOFT THE NIGHT", true],
    ["Shakespeare", "Sonnet 130 (My mistress' eyes are nothing like the sun)", "AND YET BY HEAVEN, I THINK MY LOVE AS RARE", true],
    ["Wordsworth", "I Wandered Lonely as a Cloud", "CONTINUOUS AS THE STARS THAT SHINE", true],
    ["Blake", "The Lamb", "SOFTEST CLOTHING, WOOLLY, BRIGHT", true],
    ["Shakespeare", "Sonnet 116 (Let me not to the marriage of true minds)", "IT IS THE STAR TO EVERY WANDERING BARK", true],
    ["Blake", "The Tyger", "IN THE FORESTS OF THE NIGHT, WHAT IMMORTAL HAND OR EYE", true],
    ["Blake", "The Lamb", "GAVE THEE CLOTHING OF DELIGHT, SOFTEST CLOTHING, WOOLLY, BRIGHT", true],
    ["Blake", "The Tyger", "WHEN THE STARS THREW DOWN THEIR SPEARS, AND WATERED HEAVEN WITH THEIR TEARS", true],
    ["Wordsworth", "I Wandered Lonely as a Cloud", "CONTINUOUS AS THE STARS THAT SHINE AND TWINKLE ON THE MILKY WAY", true],
    ["Shakespeare", "Sonnet 130 (My mistress' eyes are nothing like the sun)", "AND YET BY HEAVEN, I THINK MY LOVE AS RARE, AS ANY SHE BELIED WITH FALSE COMPARE.", true],
    ["Shakespeare", "Sonnet 73 (That time of year thou mayst in me behold)", "AS AFTER SUNSET FADETH IN THE WEST; WHICH BY AND BY BLACK NIGHT DOTH TAKE AWAY", true],
    ["Blake", "The Tyger", "AND WATERED HEAVEN WITH THEIR TEARS, DID HE SMILE HIS WORK TO SEE?", true],
    ["Blake", "The Lamb", "SOFTEST CLOTHING, WOOLLY, BRIGHT; GAVE THEE SUCH A TENDER VOICE", true],
    ],
  },
  {
    theme: "seasons",
    haiku: [
    ["Basho", "Summer Grasses", "SUMMER GRASSES; ALL THAT REMAINS OF WARRIORS' DREAMS."],
    ["Basho", "Spring Departs", "SPRING DEPARTS; BIRDS CRY, AND FISH EYES SEEM TEARFUL."],
    ["Basho", "Deep Autumn", "IN DEEP AUTUMN, WHAT KIND OF PERSON LIVES NEXT DOOR?"],
    ["Issa", "Final Dwelling", "IS THIS, THEN, MY FINAL DWELLING PLACE? FIVE FEET OF SNOW."],
    ["Basho", "Snow Viewing", "COME LET US GO SNOW-VIEWING TILL WE ARE BURIED"],
    ["Basho", "First Snow", "AH THE FIRST SNOW JUST ENOUGH TO BEND THE DAFFODIL LEAVES"],
    ["Buson", "Spring Rain", "SPRING RAIN TELLING A TALE AS THEY GO STRAW CAPE AND UMBRELLA"],
    ["Basho", "Crow On Branch", "ON A LEAFLESS BOUGH A CROW IS PERCHED THE AUTUMN DUSK"],
    ["Basho", "Crow On Branch", "ON A WITHERED BRANCH A CROW IS SITTING THIS AUTUMN EVE"],
    ["Basho", "Summer Grass", "OH THE SUMMER GRASS ALL THAT REMAINS OF THE WARRIORS VISIONS"],
    ["Basho", "Spring Departure", "SPRING GOING THE BIRDS CRY AND FISHES EYES ARE FULL OF TEARS"],
    ["Basho", "Crow On Branch", "ON A BARE BRANCH A CROW IS PERCHED AUTUMN EVENING"],
    ["Basho", "Summer Grass", "OH SUMMER GRASS ALL THAT IS LEFT OF THE WARRIORS DREAMS"],
    ["Basho", "Spring Night", "SPRING A NAMELESS HILL IN THIN HAZE"],
    ["Basho", "Nature", "THE FIRST SNOW JUST ENOUGH TO BEND THE LEAVES OF THE JONQUIL"],
    ["Basho", "Summer", "THE SUMMER GRASS ALL THAT REMAINS OF THE WARRIORS DREAM"],
    ["Buson", "Fox At Dusk", "A FOX TRANSMOGRIFIED AS A NOBLE THIS SPRING DUSK"],
    ],
    english: [
    ["Dickinson", "The Notice that is called the Spring", "THE NOTICE THAT IS CALLED THE SPRING", true],
    ["Dickinson", "The Summer that we did not prize,", "THE SUMMER THAT WE DID NOT PRIZE", true],
    ["Dickinson", "A little Madness in the Spring", "A LITTLE MADNESS IN THE SPRING", true],
    ["Dickinson", "Summer begins to have the look", "SUMMER BEGINS TO HAVE THE LOOK", true],
    ["Dickinson", "What shall I do when the Summer troubles --", "WHAT SHALL I DO WHEN THE SUMMER TROUBLES", true],
    ["Dickinson", "Besides the Autumn poets sing", "BESIDES THE AUTUMN POETS SING", true],
    ["Dickinson", "Twice had Summer her fair Verdure", "TWICE HAD SUMMER HER FAIR VERDURE", true],
    ["Dickinson", "I cannot meet the Spring unmoved --", "I CANNOT MEET THE SPRING UNMOVED", true],
    ["Dickinson", "Winter is good -- his Hoar Delights", "WINTER IS GOOD— HIS HOAR DELIGHTS", true],
    ["Dickinson", "A Pang is more conspicuous in Spring", "A PANG IS MORE CONSPICUOUS IN SPRING", true],
    ["Dickinson", "A little Snow was here and there", "A LITTLE SNOW WAS HERE AND THERE", true],
    ["Dickinson", "Would you like summer?  Taste of ours.", "WOULD YOU LIKE SUMMER? TASTE OF OURS.", true],
    ["Dickinson", "The One who could repeat the Summer day", "THE ONE WHO COULD REPEAT THE SUMMER DAY", true],
    ["Byron", "Lines Written in an Album, at Malta", "AS O'ER THE COLD SEPULCHRAL STONE", true],
    ["Dickinson", "No Autumn's intercepting Chill", "NO AUTUMN'S INTERCEPTING CHILL", true],
    ["Dickinson", "Summer is shorter than any one --", "SUMMER IS SHORTER THAN ANY ONE", true],
    ["Shakespeare", "Sonnet 18 (Shall I compare thee to a summer's day?)", "SHALL I COMPARE THEE TO A SUMMER'S DAY?", true],
    ["Byron", "Epitaph for William Pitt", "WITH DEATH DOOMED TO GRAPPLE, BENEATH THIS COLD SLAB, HE", true],
    ["Shakespeare", "Sonnet 18 (Shall I compare thee to a summer's day?)", "SHALL I COMPARE THEE TO A SUMMER'S DAY? THOU ART MORE LOVELY AND MORE TEMPERATE", true],
    ["Byron", "Lines Written in an Album, at Malta", "AS O'ER THE COLD SEPULCHRAL STONE SOME NAME ARRESTS THE PASSER-BY", true],
    ["Keats", "To Autumn", "I SEASON OF MISTS AND MELLOW FRUITFULNESS", true],
    ["Byron", "Epitaph for William Pitt", "WITH DEATH DOOMED TO GRAPPLE, BENEATH THIS COLD SLAB, HE WHO LIED IN THE CHAPEL", true],
    ["Byron", "Song", "OH! RUFFLE NOT THOSE LIDS OF SNOW", true],
    ["Byron", "Journal in Cephalonia", "THE HARVEST'S RIPE—AND SHALL I PAUSE TO REAP?", true],
    ["Byron", "Imitated From Catullus. to Ellen", "THE YELLOW HARVEST'S COUNTLESS SEED", true],
    ["Keats", "Ode on a Grecian Urn", "YOUR LEAVES, NOR EVER BID THE SPRING ADIEU", true],
    ["Byron", "To Thomas Moore", "AND I, THOUGH WITH COLD I HAVE NEARLY MY DEATH GOT", true],
    ["Byron", "Sun of the Sleepless!", "DISTINCT, BUT DISTANT—CLEAR—BUT, OH HOW COLD!", true],
    ["Keats", "To Autumn", "FOR SUMMER HAS O'ER-BRIMM'D THEIR CLAMMY CELLS.", true],
    ["Keats", "To Autumn", "SEASON OF MISTS AND MELLOW FRUITFULNESS", true],
    ["Shakespeare", "Sonnet 18 (Shall I compare thee to a summer's day?)", "BUT THY ETERNAL SUMMER SHALL NOT FADE", true],
    ["Byron", "Song to the Suliotes", "HERE'S THE HARVEST OF OUR LABOUR", true],
    ["Keats", "To Autumn", "WHERE ARE THE SONGS OF SPRING? AY, WHERE ARE THEY?", true],
    ["Byron", "Remembrance", "CHILL'D BY MISFORTUNE'S WINTRY BLAST", true],
    ["Keats", "To Autumn", "UNTIL THEY THINK WARM DAYS WILL NEVER CEASE", true],
    ["Byron", "Stanzas for Music", "MAY SPRING FROM THE SPOT OF THY REST", true],
    ["Byron", "On the Eyes of Miss a----H---", "HER SUN, DISPLAYS PERPETUAL SUMMER.", true],
    ["Shakespeare", "Sonnet 18 (Shall I compare thee to a summer's day?)", "AND SUMMER'S LEASE HATH ALL TOO SHORT A DATE", true],
    ["Byron", "Sonnet on Chillon", "WORN, AS IF THY COLD PAVEMENT WERE A SOD", true],
    ["Byron", "Sonnet.  to Genevra", "AND THE WARM LUSTRE OF THY FEATURES—CAUGHT", true],
    ["Shakespeare", "Sonnet 130 (My mistress' eyes are nothing like the sun)", "IF SNOW BE WHITE, WHY THEN HER BREASTS ARE DUN", true],
    ["Keats", "Bright Star", "OF SNOW UPON THE MOUNTAINS AND THE MOORS", true],
    ["Keats", "Ode on a Grecian Urn", "FOR EVER WARM AND STILL TO BE ENJOY'D", true],
    ["Shelley", "Ozymandias", "AND WRINKLED LIP, AND SNEER OF COLD COMMAND", true],
    ["Keats", "Ode on a Grecian Urn", "AS DOTH ETERNITY: COLD PASTORAL!", true],
    ["Shakespeare", "Sonnet 73 (That time of year thou mayst in me behold)", "UPON THOSE BOUGHS WHICH SHAKE AGAINST THE COLD", true],
    ["Keats", "To Autumn", "WHERE ARE THE SONGS OF SPRING? AY, WHERE ARE THEY?", true],
    ["Keats", "Bright Star", "OR GAZING ON THE NEW SOFT-FALLEN MASK OF SNOW UPON THE MOUNTAINS AND THE MOORS", true],
    ["Keats", "Ode on a Grecian Urn", "THOU, SILENT FORM, DOST TEASE US OUT OF THOUGHT AS DOTH ETERNITY: COLD PASTORAL!", true],
    ["Keats", "Ode on a Grecian Urn", "MORE HAPPY LOVE! MORE HAPPY, HAPPY LOVE! FOR EVER WARM AND STILL TO BE ENJOY'D", true],
    ["Keats", "Ode on a Grecian Urn", "YOUR LEAVES, NOR EVER BID THE SPRING ADIEU; AND, HAPPY MELODIST, UNWEARIED", true],
    ["Keats", "Ode on a Grecian Urn", "FOR EVER WARM AND STILL TO BE ENJOY'D, FOR EVER PANTING, AND FOR EVER YOUNG", true],
    ],
  },
  {
    theme: "time",
    haiku: [
    ["Shiki", "Persimmon", "BITING A PERSIMMON, THE BELL TOLLS AT HORYU-JI."],
    ["Shiki", "Persimmon Bell", "I BITE INTO A PERSIMMON AND A BELL RESOUNDS—HORYUJI TEMPLE."],
    ["Issa", "World Of Dew", "THE WORLD OF DEW IS A WORLD OF DEW AND YET AND YET"],
    ["Issa", "Transience", "THIS DEWDROP WORLD IS BUT A DEWDROP WORLD AND YET"],
    ["Shiki", "Persimmon", "I EAT A PERSIMMON THE BELL OF THE HORYUJI BEGINS TO RING"],
    ["Basho", "Old Battlefield", "AH HEARTLESS UNDER THE HELMET A CRICKET"],
    ],
    english: [
    ["Dickinson", "Suspense -- is Hostiler than Death --", "SUSPENSE— IS HOSTILER THAN DEATH", true],
    ["Byron", "My Epitaph", "YOUTH, NATURE, AND RELENTING JOVE", true],
    ["Byron", "To Penelope", "THIS DAY, OF ALL OUR DAYS, HAS DONE", true],
    ["Dickinson", "How much the present moment means", "HOW MUCH THE PRESENT MOMENT MEANS", true],
    ["Byron", "\"By the Waters of Babylon.\"", "IN THE VALLEY OF WATERS WE WEPT ON THE DAY", true],
    ["Dickinson", "The Stars are old, that stood for me --", "THE STARS ARE OLD, THAT STOOD FOR ME", true],
    ["Byron", "Journal in Cephalonia", "THE DEAD HAVE BEEN AWAKENED—SHALL I SLEEP?", true],
    ["Dickinson", "Death leaves Us homesick, who behind,", "DEATH LEAVES US HOMESICK, WHO BEHIND", true],
    ["Byron", "Translation", "AH! GENTLE, FLEETING, WAV'RING SPRITE", true],
    ["Dickinson", "Oh Future! thou secreted peace", "OH FUTURE! THOU SECRETED PEACE", true],
    ["Dickinson", "Like Some Old fashioned Miracle", "LIKE SOME OLD FASHIONED MIRACLE", true],
    ["Dickinson", "Fame's Boys and Girls, who never die", "FAME'S BOYS AND GIRLS, WHO NEVER DIE", true],
    ["Dickinson", "Love -- is that later Thing than Death --", "LOVE— IS THAT LATER THING THAN DEATH", true],
    ["Dickinson", "Bereavement in their death to feel", "BEREAVEMENT IN THEIR DEATH TO FEEL", true],
    ["Dickinson", "A Death blow is a Life blow to Some", "A DEATH BLOW IS A LIFE BLOW TO SOME", true],
    ["Dickinson", "Too happy Time dissolves itself", "TOO HAPPY TIME DISSOLVES ITSELF", true],
    ["Dickinson", "Through those old Grounds of memory,", "THROUGH THOSE OLD GROUNDS OF MEMORY", true],
    ["Shakespeare", "Sonnet 73 (That time of year thou mayst in me behold)", "THAT TIME OF YEAR THOU MAYST IN ME BEHOLD", true],
    ["Dickinson", "Robbed by Death -- but that was easy --", "ROBBED BY DEATH— BUT THAT WAS EASY", true],
    ["Byron", "On My Wedding-Day", "HERE'S A HAPPY NEW YEAR! BUT WITH REASON", true],
    ["Dickinson", "'Twas a long Parting -- but the time", "TWAS A LONG PARTING— BUT THE TIME", true],
    ["Dickinson", "'Twas just this time, last year, I died.", "TWAS JUST THIS TIME, LAST YEAR, I DIED.", true],
    ["Byron", "To Dives. a Fragment", "UNHAPPY DIVES! IN AN EVIL HOUR 'GAINST NATURE'S VOICE SEDUCED TO DEEDS ACCURST!", true],
    ["Byron", "On My Wedding-Day", "HERE'S A HAPPY NEW YEAR! BUT WITH REASON I BEG YOU'LL PERMIT ME TO SAY", true],
    ["Byron", "To Penelope", "THIS DAY, OF ALL OUR DAYS, HAS DONE THE WORST FOR ME AND YOU", true],
    ["Byron", "Endorsement to the Deed of Separation, in the April of 18 16", "A YEAR AGO YOU SWORE, FOND SHE! TO LOVE, TO HONOUR, AND SO FORTH", true],
    ["Byron", "Stanzas for Music", "THEY SAY THAT HOPE IS HAPPINESS; BUT GENUINE LOVE MUST PRIZE THE PAST", true],
    ["Byron", "To D--", "IN THEE, I FONDLY HOP'D TO CLASP A FRIEND, WHOM DEATH ALONE COULD SEVER", true],
    ["Byron", "Last Words on Greece", "WHAT ARE TO ME THOSE HONOURS OR RENOWN PAST OR TO COME, A NEW-BORN PEOPLE'S CRY?", true],
    ["Byron", "To a Lady, on Being Asked My Reason for Quitting England in the Spring", "WHEN MAN, EXPELL'D FROM EDEN'S BOWERS, A MOMENT LINGER'D NEAR THE GATE", true],
    ["Byron", "My Epitaph", "YOUTH, NATURE, AND RELENTING JOVE, TO KEEP MY LAMP IN STRONGLY STROVE", true],
    ["Shakespeare", "Sonnet 73 (That time of year thou mayst in me behold)", "THAT ON THE ASHES OF HIS YOUTH DOTH LIE", true],
    ["Shakespeare", "Sonnet 18 (Shall I compare thee to a summer's day?)", "NOR SHALL DEATH BRAG THOU WANDER'ST IN HIS SHADE", true],
    ["Keats", "To Autumn", "WHILE BARRED CLOUDS BLOOM THE SOFT-DYING DAY", true],
    ["Shakespeare", "Sonnet 18 (Shall I compare thee to a summer's day?)", "WHEN IN ETERNAL LINES TO TIME THOU GROW'ST", true],
    ["Keats", "Ode on a Grecian Urn", "FAIR YOUTH, BENEATH THE TREES, THOU CANST NOT LEAVE", true],
    ["Shakespeare", "Sonnet 73 (That time of year thou mayst in me behold)", "DEATH'S SECOND SELF, THAT SEALS UP ALL IN REST.", true],
    ["Keats", "Bright Star", "AND SO LIVE EVER—OR ELSE SWOON TO DEATH.", true],
    ["Shakespeare", "Sonnet 116 (Let me not to the marriage of true minds)", "LOVE'S NOT TIME'S FOOL, THOUGH ROSY LIPS AND CHEEKS", true],
    ["Shakespeare", "Sonnet 73 (That time of year thou mayst in me behold)", "AS THE DEATH-BED, WHEREON IT MUST EXPIRE", true],
    ["Keats", "Ode on a Grecian Urn", "THOU FOSTER-CHILD OF SILENCE AND SLOW TIME", true],
    ["Keats", "Ode on a Grecian Urn", "WHEN OLD AGE SHALL THIS GENERATION WASTE", true],
    ["Shakespeare", "Sonnet 73 (That time of year thou mayst in me behold)", "THAT ON THE ASHES OF HIS YOUTH DOTH LIE, AS THE DEATH-BED, WHEREON IT MUST EXPIRE", true],
    ["Keats", "Ode on a Grecian Urn", "AS DOTH ETERNITY: COLD PASTORAL! WHEN OLD AGE SHALL THIS GENERATION WASTE", true],
    ],
  },
  {
    theme: "flowers",
    haiku: [
    ["Chiyo", "Morning Glory", "MORNING GLORIES TOOK MY WELL-BUCKET; I ASKED NEXT DOOR FOR WATER."],
    ["Buson", "Mustard Flowers", "MUSTARD FLOWERS; THE MOON IN THE EAST, THE SUN IN THE WEST."],
    ["Chiyo", "Morning Glory", "OH MORNING GLORY THE WELL-BUCKET ENTANGLED I BEG FOR WATER"],
    ["Basho", "Clouds Of Flowers", "THE CLOUDS OF FLOWERS THE BELL IS IT OF UYENO OR OF ASAKUSA"],
    ["Buson", "Rape Flowers And Moon", "RAPE FLOWERS THE MOON IN THE EAST THE SUN IN THE WEST"],
    ["Basho", "Cherry Blossoms", "HOW MANY MANY THINGS THEY CALL TO MIND THESE CHERRY BLOSSOMS"],
    ["Basho", "Nazuna By Hedge", "WHEN I LOOK CAREFULLY I SEE THE NAZUNA BLOOMING BY THE HEDGE"],
    ["Basho", "Bush Clover", "BUSH CLOVER AND THE MOON AND SIDE BY SIDE WITH THEM TAMAGAWA"],
    ],
    english: [
    ["Byron", "Epigram on an Old Lady Who Had Some Curious Notions Respecting the Soul", "IN NOTTINGHAM COUNTY THERE LIVES AT SWAN GREEN", true],
    ["Dickinson", "I hide myself within my flower,", "I HIDE MYSELF WITHIN MY FLOWER", true],
    ["Dickinson", "She rose as high as His Occasion", "SHE ROSE AS HIGH AS HIS OCCASION", true],
    ["Dickinson", "A full fed Rose on meals of Tint", "A FULL FED ROSE ON MEALS OF TINT", true],
    ["Dickinson", "There is a flower that Bees prefer", "THERE IS A FLOWER THAT BEES PREFER", true],
    ["Dickinson", "The Rose did caper on her cheek", "THE ROSE DID CAPER ON HER CHEEK", true],
    ["Dickinson", "Perhaps you'd like to buy a flower,", "PERHAPS YOU'D LIKE TO BUY A FLOWER", true],
    ["Dickinson", "She rose to His Requirement -- dropt", "SHE ROSE TO HIS REQUIREMENT— DROPT", true],
    ["Dickinson", "As if some little Arctic flower", "AS IF SOME LITTLE ARCTIC FLOWER", true],
    ["Dickinson", "Her spirit rose to such a height", "HER SPIRIT ROSE TO SUCH A HEIGHT", true],
    ["Dickinson", "On this long storm the Rainbow rose", "ON THIS LONG STORM THE RAINBOW ROSE", true],
    ["Dickinson", "Bloom -- is Result -- to meet a Flower", "BLOOM— IS RESULT— TO MEET A FLOWER", true],
    ["Dickinson", "If I should cease to bring a Rose", "IF I SHOULD CEASE TO BRING A ROSE", true],
    ["Byron", "Oh! Snatched Away in Beauty's Bloom", "OH! SNATCHED AWAY IN BEAUTY'S BLOOM", true],
    ["Dickinson", "Nobody knows this little Rose", "NOBODY KNOWS THIS LITTLE ROSE", true],
    ["Dickinson", "We should not mind so small a flower", "WE SHOULD NOT MIND SO SMALL A FLOWER", true],
    ["Dickinson", "A Flower will not trouble her, it has so small a Foot,", "A FLOWER WILL NOT TROUBLE HER, IT HAS SO SMALL A FOOT", true],
    ["Byron", "Oh! Snatched Away in Beauty's Bloom", "OH! SNATCHED AWAY IN BEAUTY'S BLOOM, ON THEE SHALL PRESS NO PONDEROUS TOMB", true],
    ["Byron", "Stanzas for Music", "THEY ROSE THE FIRST—THEY SET THE LAST", true],
    ["Byron", "Stanzas for Music", "YOUNG FLOWERS AND AN EVERGREEN TREE", true],
    ["Byron", "Sonnet.  to Genevra", "ITS ROSE OF WHITENESS WITH THE BRIGHTEST BLUSH", true],
    ["Shakespeare", "Sonnet 130 (My mistress' eyes are nothing like the sun)", "IF HAIRS BE WIRES, BLACK WIRES GROW ON HER HEAD.", true],
    ["Byron", "To a Lady Who Presented the Author With the Velvet Band Which Bound Her Tresses", "THE LEAVES OF LOVE WILL STILL BE GREEN", true],
    ["Keats", "Ode on a Grecian Urn", "TO WHAT GREEN ALTAR, O MYSTERIOUS PRIEST", true],
    ["Byron", "Stanzas to a Lady, With the Poems of CamoëNs", "IN SINGLE SORROW DOOM'D TO FADE?", true],
    ["Keats", "Ode on a Grecian Urn", "SHE CANNOT FADE, THOUGH THOU HAST NOT THY BLISS", true],
    ["Byron", "Of That High World", "AND SOUL IN SOUL GROW DEATHLESS THEIRS!", true],
    ["Byron", "Journal in Cephalonia", "I SLUMBER NOT; THE THORN IS IN MY COUCH", true],
    ["Byron", "Verses Found in a Summer-House at Hales-Owen", "THESE FAIR GREEN WALKS DISGRACED BY INFAMY.", true],
    ["Byron", "Sonnet to the Prince Regent. on the Repeal of Lord Edward Fitzgerald's Forfeiture", "THY SOVEREIGNTY WOULD GROW BUT MORE COMPLETE", true],
    ["Keats", "To Autumn", "THE RED-BREAST WHISTLES FROM A GARDEN-CROFT", true],
    ["Keats", "Ode on a Grecian Urn", "WHAT LEAF-FRING'D LEGEND HAUNTS ABOUT THY SHAPE", true],
    ["Byron", "\"By the Waters of Babylon.\"", "ALL STRINGLESSLY HUNG IN THE WILLOW'S SAD TREE", true],
    ["Byron", "Stanzas to a Lady, With the Poems of CamoëNs", "IN SINGLE SORROW DOOM'D TO FADE? THEN READ, DEAR GIRL! WITH FEELING READ", true],
    ["Byron", "Stanzas for Music", "IN AUGHT THAT REMINDS US OF THEE. YOUNG FLOWERS AND AN EVERGREEN TREE", true],
    ["Rossetti", "A Birthday", "MY HEART IS LIKE AN APPLE-TREE WHOSE BOUGHS ARE BENT WITH THICKSET FRUIT", true],
    ],
  },
  {
    theme: "journey",
    haiku: [
    ["Issa", "Frog", "DON'T CRY LITTLE FROG EVEN ISSA HERE IS A WANDERER"],
    ["Issa", "Snail", "O SNAIL CLIMB MOUNT FUJI BUT SLOWLY SLOWLY"],
    ["Basho", "Death Poem", "ON A JOURNEY ILL MY DREAMS GO WANDERING OVER WITHERED MOORS"],
    ["Basho", "Autumn Evening", "ALONG THIS ROAD THERE ARE NO TRAVELLERS AUTUMN EVENING"],
    ["Basho", "Autumn", "ALONG THIS ROAD GOES NO ONE THIS AUTUMN EVE"],
    ],
    english: [
    ["Dickinson", "I learned -- at least -- what Home could be --", "I LEARNED— AT LEAST— WHAT HOME COULD BE", true],
    ["Byron", "Lines Written in \"Letters of an Italian Nun and an  English Gentleman, by J. J. Rousseau;  Founded on Facts.\"", "AWAY, AWAY,—YOUR FLATTERING ARTS", true],
    ["Dickinson", "Far from Love the Heavenly Father", "FAR FROM LOVE THE HEAVENLY FATHER", true],
    ["Dickinson", "I know some lonely Houses off the Road", "I KNOW SOME LONELY HOUSES OFF THE ROAD", true],
    ["Byron", "Epigram on the Braziers' Address to Be Presented in _Armour_ by the Company to Queen Caroline", "IT SEEMS THAT THE BRAZIERS PROPOSE SOON TO PASS", true],
    ["Byron", "Stanzas", "WHEN A MAN HATH NO FREEDOM TO FIGHT FOR AT HOME", true],
    ["Dickinson", "Like Men and Women Shadows walk", "LIKE MEN AND WOMEN SHADOWS WALK", true],
    ["Dickinson", "Great Streets of silence led away", "GREAT STREETS OF SILENCE LED AWAY", true],
    ["Dickinson", "The feet of people walking home", "THE FEET OF PEOPLE WALKING HOME", true],
    ["Byron", "Lines Addressed by Lord Byron to Mr. Hobhouse on His Election for Westminster", "WOULD YOU GO TO THE HOUSE BY THE TRUE GATE", true],
    ["Dickinson", "Tho' I get home how late -- how late", "THO' I GET HOME HOW LATE— HOW LATE", true],
    ["Byron", "On My Thirty-Third Birthday", "THROUGH LIFE'S DULL ROAD, SO DIM AND DIRTY", true],
    ["Dickinson", "Yesterday is History,", "YESTERDAY IS HISTORY, 'TIS SO FAR AWAY— YESTERDAY IS POETRY", true],
    ["Dickinson", "I learned -- at least -- what Home could be --", "I LEARNED— AT LEAST— WHAT HOME COULD BE— HOW IGNORANT I HAD BEEN", true],
    ["Dickinson", "Far from Love the Heavenly Father", "FAR FROM LOVE THE HEAVENLY FATHER LEADS THE CHOSEN CHILD", true],
    ["Dickinson", "The Winters are so short", "THE WINTERS ARE SO SHORT— I'M HARDLY JUSTIFIED IN SENDING ALL THE BIRDS AWAY", true],
    ["Dickinson", "I never felt at Home -- Below", "I NEVER FELT AT HOME— BELOW— AND IN THE HANDSOME SKIES", true],
    ["Dickinson", "How happy is the little Stone", "HOW HAPPY IS THE LITTLE STONE THAT RAMBLES IN THE ROAD ALONE", true],
    ["Dickinson", "The feet of people walking home", "THE FEET OF PEOPLE WALKING HOME WITH GAYER SANDALS GO", true],
    ["Dickinson", "Somewhat, to hope for,", "SOMEWHAT, TO HOPE FOR, BE IT NE'ER SO FAR IS CAPITAL AGAINST DESPAIR", true],
    ["Byron", "On My Thirty-Third Birthday", "THROUGH LIFE'S DULL ROAD, SO DIM AND DIRTY, I HAVE DRAGGED TO THREE-AND-THIRTY.", true],
    ["Byron", "Lines Written in \"Letters of an Italian Nun and an  English Gentleman, by J. J. Rousseau;  Founded on Facts.\"", "AWAY, AWAY,—YOUR FLATTERING ARTS MAY NOW BETRAY SOME SIMPLER HEARTS", true],
    ["Shakespeare", "Sonnet 130 (My mistress' eyes are nothing like the sun)", "CORAL IS FAR MORE RED, THAN HER LIPS RED", true],
    ["Byron", "Lines to a Lady Weeping", "COULD WASH A FATHER'S FAULT AWAY!", true],
    ["Keats", "Ode on a Grecian Urn", "ALL BREATHING HUMAN PASSION FAR ABOVE", true],
    ["Byron", "Stanzas Written on the Road between Florence and Pisa", "THEN AWAY WITH ALL SUCH FROM THE HEAD THAT IS HOARY", true],
    ["Blake", "The Tyger", "IN WHAT DISTANT DEEPS OR SKIES", true],
    ["Byron", "Epigram on the Braziers' Address to Be Presented in _Armour_ by the Company to Queen Caroline", "THE BRAZIERS, IT SEEMS, ARE DETERMINED TO PASS", true],
    ["Byron", "Oh! Weep for Those", "TRIBES OF THE WANDERING FOOT AND WEARY BREAST", true],
    ["Byron", "Lines Written on a Blank Leaf of _the Pleasures of Memory_", "AND BLEND, WHILE AGES ROLL AWAY", true],
    ["Byron", "To a Lady, on Being Asked My Reason for Quitting England in the Spring", "BUT, WANDERING ON THROUGH DISTANT CLIMES", true],
    ["Byron", "Stanzas to a Hindoo Air", "IN RETURN FOR THE TEARS I SHED UPON THEE WAKING", true],
    ["Shelley", "Ozymandias", "THE LONE AND LEVEL SANDS STRETCH FAR AWAY.", true],
    ["Byron", "To George Anson Byron(?)", "MY WOUNDS ARE FAR TOO DEEP FOR SIMPLE GRIEF", true],
    ["Keats", "Ode on a Grecian Urn", "WHY THOU ART DESOLATE, CAN E'ER RETURN.", true],
    ["Shakespeare", "Sonnet 130 (My mistress' eyes are nothing like the sun)", "THAT MUSIC HATH A FAR MORE PLEASING SOUND", true],
    ["Keats", "Ode on a Grecian Urn", "WILL SILENT BE; AND NOT A SOUL TO TELL WHY THOU ART DESOLATE, CAN E'ER RETURN.", true],
    ["Shakespeare", "Sonnet 130 (My mistress' eyes are nothing like the sun)", "THAT MUSIC HATH A FAR MORE PLEASING SOUND: I GRANT I NEVER SAW A GODDESS GO", true],
    ["Blake", "The Tyger", "IN WHAT DISTANT DEEPS OR SKIES BURNT THE FIRE OF THINE EYES?", true],
    ["Keats", "Ode on a Grecian Urn", "FOR EVER PANTING, AND FOR EVER YOUNG; ALL BREATHING HUMAN PASSION FAR ABOVE", true],
    ],
  },
  {
    theme: "beauty",
    haiku: [
    ["Issa", "World", "A WORLD OF GRIEF AND PAIN FLOWERS BLOOM EVEN THEN"],
    ["Buson", "Spring", "LIGHTING ONE CANDLE WITH ANOTHER CANDLE SPRING EVENING"],
    ["Basho", "Matsushima", "MATSUSHIMA YA AH MATSUSHIMA MATSUSHIMA"],
    ],
    english: [
    ["Byron", "The Conquest", "THE SON OF LOVE AND LORD OF WAR I SING", true],
    ["Byron", "The Chain I Gave.  From the Turkish", "THE CHAIN I GAVE WAS FAIR TO VIEW", true],
    ["Dickinson", "To tell the Beauty would decrease", "TO TELL THE BEAUTY WOULD DECREASE", true],
    ["Dickinson", "Her Sweet turn to leave the Homestead", "HER SWEET TURN TO LEAVE THE HOMESTEAD", true],
    ["Dickinson", "I died for Beauty -- but was scarce", "I DIED FOR BEAUTY— BUT WAS SCARCE", true],
    ["Byron", "To M. S. G", "WHEN I DREAM THAT YOU LOVE ME, YOU'LL SURELY FORGIVE", true],
    ["Dickinson", "Could that sweet Darkness where they dwell", "COULD THAT SWEET DARKNESS WHERE THEY DWELL", true],
    ["Byron", "On the Birth of John William Rizzo Hoppner", "HIS FATHER'S SENSE, HIS MOTHER'S GRACE", true],
    ["Byron", "Stanzas for Music", "THERE BE NONE OF BEAUTY'S DAUGHTERS", true],
    ["Byron", "To Anne", "OH SAY NOT, SWEET ANNE, THAT THE FATES HAVE DECREED", true],
    ["Byron", "From the French", "AEGLE BEAUTY AND POET HAS TWO LITTLE CRIMES"],
    ["Dickinson", "Estranged from Beauty -- none can be --", "ESTRANGED FROM BEAUTY— NONE CAN BE", true],
    ["Byron", "The Spell Is Broke, the Charm Is Flown!", "THE SPELL IS BROKE, THE CHARM IS FLOWN!", true],
    ["Dickinson", "The Soul has Bandaged moments --", "THE SOUL HAS BANDAGED MOMENTS", true],
    ["Dickinson", "Those fair -- fictitious People", "THOSE FAIR— FICTITIOUS PEOPLE", true],
    ["Dickinson", "Touch lightly Nature's sweet Guitar", "TOUCH LIGHTLY NATURE'S SWEET GUITAR", true],
    ["Byron", "On Parting", "THE KISS, DEAR MAID! THY LIP HAS LEFT", true],
    ["Byron", "From the Portuguese. \"Tu MI Chamas\"", "IN MOMENTS TO DELIGHT DEVOTED", true],
    ["Byron", "Imitated From Catullus. to Ellen", "OH! MIGHT I KISS THOSE EYES OF FIRE", true],
    ["Byron", "Impromptu, in Reply to a Friend", "WHEN, FROM THE HEART WHERE SORROW SITS", true],
    ["Byron", "Sonnet.  to Genevra", "THINE EYES' BLUE TENDERNESS, THY LONG FAIR HAIR", true],
    ["Dickinson", "We dream -- it is good we are dreaming --", "WE DREAM— IT IS GOOD WE ARE DREAMING", true],
    ["Byron", "On a Cornelian Heart Which Was Broken", "ILL-FATED HEART! AND CAN IT BE, THAT THOU SHOULDST THUS BE RENT IN TWAIN?", true],
    ["Dickinson", "Joy to have merited the Pain --", "JOY TO HAVE MERITED THE PAIN— TO MERIT THE RELEASE", true],
    ["Dickinson", "The Soul has Bandaged moments --", "THE SOUL HAS BANDAGED MOMENTS— WHEN TOO APPALLED TO STIR", true],
    ["Dickinson", "Beauty -- be not caused -- It Is --", "BEAUTY— BE NOT CAUSED— IT IS— CHASE IT, AND IT CEASES— CHASE IT NOT, AND IT ABIDES", true],
    ["Dickinson", "Touch lightly Nature's sweet Guitar", "TOUCH LIGHTLY NATURE'S SWEET GUITAR UNLESS THOU KNOW'ST THE TUNE", true],
    ["Dickinson", "Hope is a subtle Glutton --", "HOPE IS A SUBTLE GLUTTON— HE FEEDS UPON THE FAIR", true],
    ["Dickinson", "\"Hope\" is the thing with feathers", "HOPE IS THE THING WITH FEATHERS— THAT PERCHES IN THE SOUL", true],
    ["Byron", "Lines in the Travellers' Book at Orchomenus", "IN THIS BOOK A TRAVELLER HAD WRITTEN:— FAIR ALBION, SMILING, SEES HER SON DEPART", true],
    ["Shakespeare", "Sonnet 116 (Let me not to the marriage of true minds)", "LET ME NOT TO THE MARRIAGE OF TRUE MINDS ADMIT IMPEDIMENTS. LOVE IS NOT LOVE", true],
    ["Keats", "Bright Star", "AWAKE FOR EVER IN A SWEET UNREST", true],
    ["Keats", "Ode on a Grecian Urn", "FOR EVER WILT THOU LOVE, AND SHE BE FAIR!", true],
    ["Keats", "Bright Star", "STILL, STILL TO HEAR HER TENDER-TAKEN BREATH", true],
    ["Shakespeare", "Sonnet 73 (That time of year thou mayst in me behold)", "BARE RUIN'D CHOIRS, WHERE LATE THE SWEET BIRDS SANG.", true],
    ["Wordsworth", "I Wandered Lonely as a Cloud", "AND THEN MY HEART WITH PLEASURE FILLS", true],
    ["Keats", "To Autumn", "WITH A SWEET KERNEL; TO SET BUDDING MORE", true],
    ["Blake", "The Tyger", "COULD TWIST THE SINEWS OF THY HEART?", true],
    ["Rossetti", "A Birthday", "MY HEART IS GLADDER THAN ALL THESE", true],
    ["Shakespeare", "Sonnet 18 (Shall I compare thee to a summer's day?)", "NOR LOSE POSSESSION OF THAT FAIR THOU OW'ST", true],
    ["Shelley", "Ozymandias", "THE HAND THAT MOCKED THEM, AND THE HEART THAT FED", true],
    ["Keats", "Ode on a Grecian Urn", "WILL SILENT BE; AND NOT A SOUL TO TELL", true],
    ["Keats", "Ode on a Grecian Urn", "BOLD LOVER, NEVER, NEVER CANST THOU KISS", true],
    ["Shakespeare", "Sonnet 116 (Let me not to the marriage of true minds)", "LOVE ALTERS NOT WITH HIS BRIEF HOURS AND WEEKS", true],
    ["Keats", "Ode on a Grecian Urn", "BEAUTY IS TRUTH, TRUTH BEAUTY,—THAT IS ALL", true],
    ["Blake", "The Tyger", "AND, WHEN THY HEART BEGAN TO BEAT", true],
    ["Shakespeare", "Sonnet 130 (My mistress' eyes are nothing like the sun)", "AND IN SOME PERFUMES IS THERE MORE DELIGHT", true],
    ["Shakespeare", "Sonnet 29 (When in disgrace with fortune and men's eyes)", "FOR THY SWEET LOVE REMEMBER'D SUCH WEALTH BRINGS", true],
    ["Keats", "Ode on a Grecian Urn", "HEARD MELODIES ARE SWEET, BUT THOSE UNHEARD", true],
    ["Shakespeare", "Sonnet 116 (Let me not to the marriage of true minds)", "ADMIT IMPEDIMENTS. LOVE IS NOT LOVE", true],
    ["Keats", "Ode on a Grecian Urn", "THAT LEAVES A HEART HIGH-SORROWFUL AND CLOY'D", true],
    ["Keats", "Ode on a Grecian Urn", "MORE HAPPY LOVE! MORE HAPPY, HAPPY LOVE!", true],
    ["Keats", "Bright Star", "PILLOW'D UPON MY FAIR LOVE'S RIPENING BREAST", true],
    ["Shakespeare", "Sonnet 18 (Shall I compare thee to a summer's day?)", "AND EVERY FAIR FROM FAIR SOMETIME DECLINES", true],
    ["Blake", "The Lamb", "GAVE THEE CLOTHING OF DELIGHT", true],
    ],
  },
  {
    theme: "wind",
    haiku: [
    ["Basho", "Autumn Wind", "HOW RELUCTANT I AM TO GO THE AUTUMN WIND OF ISE'S SHORE"],
    ["Shiki", "Autumn Wind", "THE AUTUMN WIND FOR ME THERE ARE NO GODS THERE ARE NO BUDDHAS"],
    ["Hokushi", "Fire And Flowers", "IT HAS BURNED DOWN HOW SERENE THE FLOWERS IN THEIR FALLING"],
    ],
    english: [
    ["Dickinson", "Three times -- we parted -- Breath -- and I --", "THREE TIMES— WE PARTED— BREATH— AND I", true],
    ["Byron", "Bowles and Campbell", "TO THE AIR OF HOW NOW, MADAM FLIRT, IN THE BEGGAR'S OPERA", true],
    ["Byron", "Bowles and Campbell", "TO THE AIR OF HOW NOW, MADAM FLIRT, IN THE BEGGAR'S OPERA. BOWLES.", true],
    ["Dickinson", "Three times -- we parted -- Breath -- and I --", "THREE TIMES— WE PARTED— BREATH— AND I— THREE TIMES— HE WOULD NOT GO", true],
    ["Dickinson", "A Murmur in the Trees -- to note", "A MURMUR IN THE TREES— TO NOTE— NOT LOUD ENOUGH— FOR WIND", true],
    ["Byron", "On the Death of the Duke of Dorset", "I HEARD THY FATE WITHOUT A TEAR, THY LOSS WITH SCARCE A SIGH", true],
    ["Byron", "On Finding a Fan", "IN ONE WHO FELT AS ONCE HE FELT, THIS MIGHT, PERHAPS, HAVE FANN'D THE FLAME", true],
    ["Byron", "Farewell! If Ever Fondest Prayer", "MINE WILL NOT ALL BE LOST IN AIR", true],
    ["Blake", "The Tyger", "WHAT THE HAND DARE SEIZE THE FIRE?", true],
    ["Byron", "Jephtha's Daughter", "THERE CANNOT BE PAIN IN THE BLOW!", true],
    ["Byron", "On Revisiting Harrow", "OR FRIENDSHIP'S TEARS, PRIDE RUSH'D BETWEEN", true],
    ["Byron", "My Soul Is Dark", "TWILL FLOW, AND CEASE TO BURN MY BRAIN.", true],
    ["Byron", "On Jordan's Banks", "THY GLORY SHROUDED IN ITS GARB OF FIRE", true],
    ["Byron", "To Anne", "THE RAGE OF THE TEMPEST UNITED MUST WEATHER", true],
    ["Byron", "Sonnet.  to Genevra", "HAVE THROWN SUCH SPEAKING SADNESS IN THINE AIR", true],
    ["Dickinson", "She's happy, with a new Content --", "AS JUST APPRENTICED TO THE AIR", true],
    ["Dickinson", "Tho' I get home how late -- how late", "TO THINK JUST HOW THE FIRE WILL BURN", true],
    ["Byron", "Song", "CHILL IS THY BREATH, THOU BREEZE OF NIGHT!", true],
    ["Byron", "Stanzas to a Lady, With the Poems of CamoëNs", "HIS WAS NO FAINT, FICTITIOUS FLAME", true],
    ["Byron", "A Fragment", "WHEN, POIS'D UPON THE GALE, MY FORM SHALL RIDE", true],
    ["Byron", "Written After Swimming From Sestos to Abydos", "IF, WHEN THE WINTRY TEMPEST ROARED", true],
    ["Shakespeare", "Sonnet 73 (That time of year thou mayst in me behold)", "IN ME THOU SEE'ST THE GLOWING OF SUCH FIRE", true],
    ["Dickinson", "A Drop Fell on the Apple Tree --", "THE DUST REPLACED, IN HOISTED ROADS", true],
    ["Dickinson", "Three times -- we parted -- Breath -- and I --", "THE WAVES GREW SLEEPY— BREATH— DID NOT", true],
    ["Dickinson", "I know a place where Summer strives", "BUT WHEN THE SOUTH WIND STIRS THE POOLS", true],
    ["Shakespeare", "Sonnet 130 (My mistress' eyes are nothing like the sun)", "THAN IN THE BREATH THAT FROM MY MISTRESS REEKS.", true],
    ["Dickinson", "\"Hope\" is the thing with feathers", "AND SWEETEST— IN THE GALE— IS HEARD", true],
    ["Dickinson", "\"Arcturus\" is his other name", "COMPUTES THE STAMENS IN A BREATH", true],
    ["Dickinson", "Bloom -- is Result -- to meet a Flower", "ADJUST THE HEAT— ELUDE THE WIND", true],
    ["Keats", "To Autumn", "THY HAIR SOFT-LIFTED BY THE WINNOWING WIND", true],
    ["Dickinson", "I got so I could take his name", "WITHOUT THAT FORCING, IN MY BREATH", true],
    ["Wordsworth", "I Wandered Lonely as a Cloud", "FLUTTERING AND DANCING IN THE BREEZE.", true],
    ["Dickinson", "Glass was the Street -- in tinsel Peril", "FILLED WAS THE AIR WITH MERRY VENTURE", true],
    ["Dickinson", "From all the Jails the Boys and Girls", "THEY STORM THE EARTH AND STUN THE AIR", true],
    ["Dickinson", "Flowers -- Well -- if anybody", "I WILL GIVE HIM ALL THE DAISIES WHICH UPON THE HILLSIDE BLOW.", true],
    ["Blake", "The Tyger", "BURNT THE FIRE OF THINE EYES? ON WHAT WINGS DARE HE ASPIRE?", true],
    ["Blake", "The Tyger", "ON WHAT WINGS DARE HE ASPIRE? WHAT THE HAND DARE SEIZE THE FIRE?", true],
    ],
  },
];

const HAIKU_FLAT: { theme: number; entry: PoemEntry }[] = [];
for (let t = 0; t < THEME_POOLS.length; t++) {
  for (let i = 0; i < THEME_POOLS[t].haiku.length; i++) {
    HAIKU_FLAT.push({ theme: t, entry: THEME_POOLS[t].haiku[i] });
  }
}

function pickThematicPair(
  index: number,
  salt: string,
): { haiku: PoemEntry; english: PoemEntry } {
  const h = HAIKU_FLAT[index % HAIKU_FLAT.length];
  const group = THEME_POOLS[h.theme];
  const pairRand = seededRandom(`serpentine:pair:${salt}:${index}`);
  const ei = Math.floor(pairRand() * group.english.length);
  return { haiku: h.entry, english: group.english[ei] };
}

export function getThemedPuzzle(
  difficulty: Difficulty,
  index: number,
  salt: string,
): PuzzleDef {
  const pair = pickThematicPair(index, salt);
  const entry = difficulty === "haiku" ? pair.haiku : pair.english;
  const prefix = difficulty === "haiku" ? "h" : "p";
  const id = `${prefix}${String(index % HAIKU_FLAT.length + 1).padStart(3, "0")}`;
  const rand = seededRandom(`serpentine:layout:${id}:${salt}`);
  return expand(entry[0], entry[1], entry[2], id, difficulty, rand, entry[3] ?? false);
}

export function getPoolSize(): number {
  return HAIKU_FLAT.length;
}

/** Every phrase in the pools, or just one pool's, for corpus tests. */
export function allPoemEntries(pool?: "haiku" | "english"): PoemEntry[] {
  return THEME_POOLS.flatMap((g) =>
    pool ? g[pool] : [...g.haiku, ...g.english],
  );
}
