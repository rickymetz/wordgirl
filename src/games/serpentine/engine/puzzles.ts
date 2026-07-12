import { seededRandom } from "../../../lib/random";
import type { Cell, Difficulty, PuzzleDef } from "./types";
import { MAX_ROWS, MAX_COLS, cellKey, areAdjacent } from "./types";

/**
 * Poetry entries for Serpentine puzzles.
 * Format: [author, title, text]
 *
 * HAIKU: verified public-domain translations from Chamberlain (1910),
 * Aston (1899), Hearn (1898-1902), and Noguchi (1914).
 *
 * ENGLISH: verified public-domain poem lines from canonical poets.
 *
 * The two pools are independent — haiku cycles every 140 days,
 * English every 481 days. Pairings naturally shuffle on repeat.
 */
type PoemEntry = [string, string, string];

/**
 * Find the smallest bounding rectangle that fits `n` cells within
 * MAX_ROWS × MAX_COLS, preferring near-square shapes. Returns the
 * grid dimensions — the grid may contain (rows*cols - n) blocked cells.
 */
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
): PuzzleDef {
  const displayTitle = `${title} — ${author}`;
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
  return { id, title: displayTitle, difficulty, rows, cols, grid, text, path, blocked };
}

// --- Poetry pools ---

const HAIKU: PoemEntry[] = [
  ["Basho", "Crow On Branch", "ON A WITHERED BRANCH A CROW IS SITTING THIS AUTUMN EVE"],
  ["Basho", "Clouds Of Flowers", "THE CLOUDS OF FLOWERS THE BELL IS IT OF UYENO OR OF ASAKUSA"],
  ["Basho", "Death Poem", "ON A JOURNEY ILL MY DREAMS GO WANDERING OVER WITHERED MOORS"],
  ["Basho", "Snow-viewing", "COME LET US GO SNOWVIEWING TILL WE ARE BURIED"],
  ["Basho", "Stillness And Locust", "HOW STILL IT IS STINGING INTO THE STONES THE LOCUSTS TRILL"],
  ["Basho", "Nazuna By Hedge", "WHEN I LOOK CAREFULLY I SEE THE NAZUNA BLOOMING BY THE HEDGE"],
  ["Basho", "Rough Sea And Milky Way", "A ROUGH SEA AND STRETCHING OVER SADO THE MILKY WAY"],
  ["Basho", "Matsushima", "MATSUSHIMA YA AH MATSUSHIMA MATSUSHIMA"],
  ["Basho", "Old Battlefield", "AH HEARTLESS UNDER THE HELMET A CRICKET"],
  ["Kikaku", "Harvest Moon", "AUTUMNS FULL MOON LO THE SHADOWS OF A PINETREE UPON THE MATS"],
  ["Kikaku", "Fallen Flower", "A FALLEN FLOWER FLEW BACK TO ITS BRANCH NO IT WAS A BUTTERFLY"],
  ["Buson", "Rape-flower Field", "THE SHORT NIGHT ON THE HAIRY CATERPILLAR BEADS OF DEW"],
  ["Buson", "Rape-flowers And Moon", "RAPEFLOWERS THE MOON IN THE EAST THE SUN IN THE WEST"],
  ["Issa", "Lean Frog", "LEAN FROG DONT GIVE UP THE FIGHT ISSA IS HERE"],
  ["Issa", "World Of Dew", "THE WORLD OF DEW IS A WORLD OF DEW AND YET AND YET"],
  ["Issa", "Snail", "LITTLE SNAIL SLOWLY SLOWLY CLIMB UP FUJIYAMA"],
  ["Chiyo", "Morning-glory", "OH MORNINGGLORY THE WELLBUCKET ENTANGLED I BEG FOR WATER"],
  ["Basho", "Cicada", "NOTHING IN THE CICADAS VOICE GIVES TOKEN OF A SPEEDY DEATH"],
  ["Basho", "Rough Sea And Milky Way", "A ROUGH SEA AND THE MILKY WAY STRETCHING ACROSS TO SADOS ISLE"],
  ["Basho", "Crow On Branch", "ON A LEAFLESS BOUGH A CROW IS PERCHED THE AUTUMN DUSK"],
  ["Basho", "Summer Grass", "OH THE SUMMER GRASS ALL THAT REMAINS OF THE WARRIORS VISIONS"],
  ["Basho", "Stillness And Cicada", "STILLNESS PENETRATING THE ROCKS THE VOICE OF THE LOCUST"],
  ["Basho", "Autumn Moon", "THE MOON SWIFTSPEEDING THE TREETOPS HOLDING THE RAINDROPS"],
  ["Basho", "Sea Darkening", "THE SEA DARKENING THE VOICES OF THE WILD DUCKS FAINTLY WHITE"],
  ["Basho", "Spring Departure", "SPRING GOING THE BIRDS CRY AND FISHES EYES ARE FULL OF TEARS"],
  ["Basho", "Octopus And Summer Moon", "THE OCTOPUS TRAP TRANSIENT DREAMS UNDER THE SUMMER MOON"],
  ["Basho", "Bush Clover And Moon", "BUSHCLOVER AND THE MOON AND SIDE BY SIDE WITH THEM TAMAGAWA"],
  ["Basho", "First Snow", "AH THE FIRST SNOW JUST ENOUGH TO BEND THE DAFFODIL LEAVES"],
  ["Basho", "Skylark", "A SKYLARK SINGING NOTHING ELSE IN THE FIELDS"],
  ["Basho", "Old Pond", "AN OLD POND A FROG JUMPS IN THE SOUND OF THE WATER"],
  ["Buson", "Fox At Dusk", "A FOX TRANSMOGRIFIED AS A NOBLE THIS SPRING DUSK"],
  ["Hokushi", "Fire And Flowers", "IT HAS BURNED DOWN HOW SERENE THE FLOWERS IN THEIR FALLING"],
  ["Basho", "Autumn Wind", "HOW RELUCTANT I AM TO GO THE AUTUMN WIND OF ISES SHORE"],
  ["Basho", "Crow On Branch", "ON A BARE BRANCH A CROW IS PERCHED AUTUMN EVENING"],
  ["Basho", "Silence And Rocks", "OH HOW STILL THE VOICE OF THE CICADA SINKS INTO THE ROCKS"],
  ["Basho", "Summer Grass", "OH SUMMER GRASS ALL THAT IS LEFT OF THE WARRIORS DREAMS"],
  ["Basho", "Cherry Blossoms", "HOW MANY MANY THINGS THEY CALL TO MIND THESE CHERRY BLOSSOMS"],
  ["Buson", "Spring Rain", "SPRING RAIN TELLING A TALE AS THEY GO STRAW CAPE AND UMBRELLA"],
  ["Basho", "Spring Night", "SPRING A NAMELESS HILL IN THIN HAZE"],
  ["Basho", "Clouds Of Flowers", "CLOUDS OF FLOWERS IS THAT BELL IN UYENO OR ASAKUSA"],
  ["Shiki", "Autumn Wind", "THE AUTUMN WIND FOR ME THERE ARE NO GODS THERE ARE NO BUDDHAS"],
  ["Chiyo", "Morning-glory", "OH MORNING GLORY THE WELLBUCKET ENTANGLED I ASK FOR WATER"],
  ["Basho", "Lightning", "LIGHTNING AND INTO THE DARKNESS THE CRY OF A HERON"],
  ["Basho", "Old Pond", "THE OLD POND AYE AND THE SOUND OF A FROG LEAPING INTO THE WATER"],
  ["Basho", "Spring Passing", "SPRING GOING BIRDS CRY AND THE FISHES EYES ARE FULL OF TEARS"],
  ["Basho", "Autumn Evening", "ALONG THIS ROAD THERE ARE NO TRAVELLERS AUTUMN EVENING"],
  ["Basho", "Ivy", "COME COME THOUGH I CRY THE FIREFLY GOES ITS WAY"],
  ["Basho", "Frog", "OLD POND FROGS JUMPING IN SOUND OF WATER"],
  ["Traditional", "Frog", "A FROG AND I GAZING AT EACH OTHER NEITHER OF US MOVES"],
  ["Issa", "Frog", "DONT CRY LITTLE FROG EVEN ISSA HERE IS A WANDERER"],
  ["Traditional", "Frog", "CALM AND SERENE THE SOUND OF A FROG LEAPING INTO A POND"],
  ["Traditional", "Dragonfly", "RED DRAGONFLY ALIGHTING UPON MY HAND BENDING HIS TAIL"],
  ["Traditional", "Dragonfly", "ON THE NOSE OF THE SCARECROW A DRAGONFLY"],
  ["Traditional", "Dragonfly", "DRAGONFLY CATCHER HOW FAR HAVE YOU GONE TODAY"],
  ["Traditional", "Butterfly", "THE BUTTERFLY HAVING DISAPPEARED MY SPIRIT CAME BACK TO ME"],
  ["Basho", "Butterfly", "ASLEEP UPON THE TEMPLEBELL THE BUTTERFLY"],
  ["Traditional", "Butterfly", "EVEN THE BUTTERFLY IS AFRAID OF THE HAWK"],
  ["Traditional", "Butterfly", "FALLEN FLOWER RETURNING TO THE BRANCH IT WAS A BUTTERFLY"],
  ["Traditional", "Butterfly", "TWO BUTTERFLIES FLEW INTO THE SUNSET AND WERE LOST"],
  ["Traditional", "Cricket", "THE CRY OF THE BELLINSECT MEANS THAT AUTUMN HAS COME"],
  ["Traditional", "Cricket", "THE KIRIGIRISU IS CHANTING HIS CHANT UNDER MY FLOOR"],
  ["Traditional", "Cricket", "THE BELLINSECT IS RINGING HIS LITTLE BELL THEN GOES TO SLEEP"],
  ["Traditional", "Insect", "THE SINGER OF SONGS HE HIDES HIMSELF AND SINGS"],
  ["Traditional", "Insect", "WHAT A SINGER OF SONGS HE CARRIES HIS MUSICBOX ON HIS BACK"],
  ["Traditional", "Insect", "THE INSECTSELLERS BELL SOUNDS FAINTLY GOING FAR AWAY"],
  ["Traditional", "Silkworm", "SILKWORMS EVEN THEY WHEN HUNGRY ARE NOT SILENT"],
  ["Traditional", "Silkworm", "EVEN THE SILKWORM HAS ITS JOYS AND SORROWS SHOWN IN ITS FACE"],
  ["Issa", "Mosquito", "THE MOSQUITONET HOW FAR OFF IT HAS PUSHED THE STARS"],
  ["Traditional", "Ant", "WHAT CONSIDERATION THE ANT LIFTS HER HEAD BEFORE A GUEST"],
  ["Issa", "Firefly", "FIREFLY THAT WAY THAT WAY THIS WAY THAT WAY THAT WAY THIS WAY"],
  ["Traditional", "Firefly", "ON THE GREAT RIVER THE FIREFLY PROCESSION MOVES AND PASSES"],
  ["Traditional", "Cicada", "THE VOICE OF THE SEMI MAKES THE ROCKS FEEL HOTTER"],
  ["Traditional", "Cicada", "SOON THE SEMI WILL DIE THERE IS NOTHING OF THIS IN HIS VOICE"],
  ["Traditional", "Jizo", "SAD IS THE FACE OF THE JIZO WHO PROTECTS CHILDREN FROM DEMONS"],
  ["Traditional", "Ghost", "THE GHOSTS OF ALL THE THINGS THAT WERE REVISIT THE MOONLIGHT"],
  ["Traditional", "Footsteps", "EVEN HIS SHADOW PASSING ON THE SHOJI CHILLS MY HEART"],
  ["Traditional", "Dream", "IN THE DREAM I SAW HER FACE AGAIN UNDER THE PLUMBLOSSOMS"],
  ["Traditional", "Spring", "HAVING PLANTED A TREE I REST LISTENING TO THE BREEZE"],
  ["Traditional", "Child", "THE CHILD NOT CRYING WHEN ABANDONED LOOKED AT THE MOON"],
  ["Basho", "Nature", "THE OLD POND A FROG JUMPS IN SOUND OF WATER"],
  ["Traditional", "Death", "THE DEAD ONES FACE HOW CALM THE WILD CHRYSANTHEMUM"],
  ["Traditional", "Snow", "SNOW FALLING ON THE FAR VILLAGE SEEN AT TWILIGHT"],
  ["Traditional", "Night", "ALL THINGS BECOME DROWNED IN THE SONG OF THE FROGS"],
  ["Basho", "Summer", "THE SUMMER GRASS ALL THAT REMAINS OF THE WARRIORS DREAM"],
  ["Traditional", "Autumn", "THE AUTUMN MOON SHINES ON A THOUSAND RICEFIELDS AND ON ME"],
  ["Traditional", "Night", "THE LIGHTS OF THE FIREFLIES TANGLED IN THE REEDS ARE COLD"],
  ["Traditional", "Sorrow", "EVEN WHEN THE CANDLE DIES THE COLD OF THE NIGHT BEGINS"],
  ["Traditional", "Nature", "COME BUTTERFLIES COME MY CHILDREN ARE ASLEEP"],
  ["Traditional", "Solitude", "THE OLD WOMAN ALONE LOOKING AT THE MOON"],
  ["Traditional", "Farewell", "I MUST GO NOW SO FAREWELL FIREFLIES OF THE MARSH"],
  ["Traditional", "Beauty", "PLUMBLOSSOMS EVEN THE THIEF PAUSED TO GAZE"],
  ["Traditional", "Nature", "EVEN AMONG INSECTS SOME CAN SING AND SOME CANNOT"],
  ["Traditional", "Beauty", "WHEN LOOKING AT THE MOON I FEEL THAT THIS WORLD IS TOO SMALL"],
  ["Basho", "Autumn", "ALONG THIS ROAD GOES NO ONE THIS AUTUMN EVE"],
  ["Traditional", "Death", "AH THE OLD TEMPLE PEEPING THROUGH THE GATE A DEER"],
  ["Buson", "Spring", "THE SPRING SEA RISING AND FALLING RISING AND FALLING ALL DAY"],
  ["Traditional", "Dream", "THE DREAM ENDED I WOKE TO FIND SNOW UPON MY SLEEVES"],
  ["Traditional", "Transience", "THIS DEWDROP WORLD IS A DEWDROP WORLD AND YET AND YET"],
  ["Issa", "Transience", "THIS DEWDROP WORLD IS BUT A DEWDROP WORLD AND YET"],
  ["Traditional", "Loneliness", "HOW LONELY NOT EVEN A BIRDCRY HEARD ON THE MOUNTAIN"],
  ["Traditional", "Mosquito", "EVEN BY THE LITTLE MOSQUITO I AM NOT DISLIKED IT COMES AT ONCE"],
  ["Traditional", "Insect", "IN THE GARDEN ONLY THE SOUND OF AN INSECT DRYING ITS WINGS"],
  ["Traditional", "Insect", "EVEN THE INSECT THAT LIVES ONLY FOR A DAY SINGS ITS SONG"],
  ["Traditional", "Cricket", "THE CRICKET SANG AND STOPPED SINGING MOONLIGHT"],
  ["Traditional", "Firefly", "THE DEAD MANS HAND HOLDING A FIREFLY IN THE DARK"],
  ["Traditional", "Grasshopper", "ON MY HAT THE GRASSHOPPER TRAVELING WITH ME"],
  ["Traditional", "Evening", "EVEN THE KITE IN THE EVENING CALM HAS A PLACE TO SLEEP"],
  ["Traditional", "Loneliness", "THE SNAIL ON THE LEAF TURNED ITS HEAD AND LOOKED AT ME"],
  ["Traditional", "Pathos", "TAKING UP THE CHILD I FOUND THAT IT WAS LIGHT AS DRIED FLOWERS"],
  ["Buson", "Evening", "ON THE TEMPLEBELL SETTLED AND SLEEPING A BUTTERFLY"],
  ["Traditional", "Moon", "THE MOON HAS SET THE TREES IN THE RAIN WHISPER TOGETHER"],
  ["Traditional", "Autumn", "AUTUMN HAVING COME THE BUTTERFLY VISITS THE CHRYSANTHEMUM"],
  ["Traditional", "Frog", "IN THE RAINY SEASON EVEN THE FROGS ARE COLD"],
  ["Traditional", "Butterfly", "THE DEAD BUTTERFLY ITS SPIRIT BECOMES A FLOWER"],
  ["Shiki", "Persimmon", "I EAT A PERSIMMON THE BELL OF THE HORYUJI BEGINS TO RING"],
  ["Traditional", "Death", "NO SKY AT ALL NO EARTH AT ALL AND STILL THE SNOWFLAKES FALL"],
  ["Traditional", "Autumn", "THE AUTUMN WIND BLOWS ME ALONG THE STREET LIKE A TORN PAPER"],
  ["Traditional", "Night", "LISTENING LISTENING THE SHOWER UPON THE LEAVES"],
  ["Buson", "Spring", "LIGHTING ONE CANDLE WITH ANOTHER CANDLE SPRING EVENING"],
  ["Issa", "Sparrow", "COME AND PLAY WITH ME FATHERLESS SPARROW"],
  ["Traditional", "Dawn", "DAY BREAKS AND THE FISHINGBOATS CREEP INTO SIGHT"],
  ["Traditional", "Loneliness", "THE CRY OF THE WILD GEESE THEREAFTER ONLY THE MOON"],
  ["Traditional", "Nature", "UNDER CHERRYBLOSSOMS THERE ARE NO STRANGERS"],
  ["Traditional", "Winter", "ALL THE FIELD HAS BEEN EATEN BY THE SUNSET"],
  ["Issa", "Snail", "O SNAIL CLIMB MOUNT FUJI BUT SLOWLY SLOWLY"],
  ["Traditional", "Frog", "THE FROG DOES NOT DRINK UP THE POND IN WHICH HE LIVES"],
  ["Kikaku", "Firefly", "A FIREFLY FLEW FROM MY FINGERS INTO THE DARK"],
  ["Traditional", "Autumn", "LEAF AFTER LEAF FALLS UPON THE GRAVE OF THE CHILD"],
  ["Buson", "Willow", "UNDER THE WILLOW THE STREAM PAUSES IN THE TWILIGHT"],
  ["Traditional", "Storm", "AFTER THE STORM ON THE BROKEN FENCE A BUTTERFLY"],
  ["Traditional", "Cold", "THE WINTER WIND IT COMES INTO THE VERY BONES OF THE SCARECROW"],
  ["Traditional", "Moon", "THE HARVEST MOON MAKES THE PONDS AND THE SEA ALL ONE"],
  ["Traditional", "Sadness", "PITIFUL UNDERNEATH THE HELMET A GRASSHOPPER"],
  ["Basho", "Nature", "THE FIRST SNOW JUST ENOUGH TO BEND THE LEAVES OF THE JONQUIL"],
  ["Traditional", "Cherry Blossom", "THE BLOSSOMS HAVE FALLEN OUR MINDS ARE NOW TRANQUIL"],
  ["Traditional", "Summer", "EVEN THE THIEF LEFT IT BEHIND THIS MOON AT THE WINDOW"],
  ["Issa", "World", "A WORLD OF GRIEF AND PAIN FLOWERS BLOOM EVEN THEN"],
  ["Traditional", "Evening", "THE LANTERN HAVING GONE OUT THE STARS ON THE RIVER"],
  ["Traditional", "Morning", "THE COCK IS CROWING THE LIGHT BEGINS ON THE MOUNTAIN OF DEATH"],
  ["Traditional", "Night", "IN THE MIDNIGHT OF THE OLD TEMPLE A CANDLE IS BURNING"]
];

const ENGLISH: PoemEntry[] = [
  ["Coleridge", "Kubla Khan", "IN XANADU DID KUBLA KHAN A STATELY PLEASURE DOME DECREE"],
  ["Shelley", "The Cloud", "I BRING FRESH SHOWERS FOR THE THIRSTING FLOWERS"],
  ["Wordsworth", "Tintern Abbey", "THE SOUNDING CATARACT HAUNTED ME LIKE A PASSION"],
  ["Tennyson", "The Brook", "FOR MEN MAY COME AND MEN MAY GO BUT I GO ON FOREVER"],
  ["Keats", "Endymion", "A THING OF BEAUTY IS A JOY FOREVER ITS LOVELINESS INCREASES"],
  ["Byron", "Ocean", "ROLL ON THOU DEEP AND DARK BLUE OCEAN ROLL"],
  ["Poe", "Bells", "HEAR THE SLEDGES WITH THE BELLS SILVER BELLS"],
  ["Whitman", "Sea Drift", "OUT OF THE CRADLE ENDLESSLY ROCKING OUT OF THE MOCKING"],
  ["Dickinson", "Well", "THE TRUTH MUST DAZZLE GRADUALLY OR EVERY MAN BE BLIND"],
  ["Shakespeare", "Moonlight", "HOW SWEET THE MOONLIGHT SLEEPS UPON THIS BANK"],
  ["Shelley", "To the Moon", "ART THOU PALE FOR WEARINESS OF CLIMBING HEAVEN"],
  ["Keats", "Bright Star", "BRIGHT STAR WOULD I WERE STEADFAST AS THOU ART"],
  ["Whitman", "Night Sky", "WHEN I HEARD THE LEARNED ASTRONOMER I LOOKED UP IN SILENCE"],
  ["Coleridge", "Frost at Midnight", "THE FROST PERFORMS ITS SECRET MINISTRY UNHELPED BY ANY WIND"],
  ["Blake", "Night", "THE MOON LIKE A FLOWER IN HEAVENS HIGH BOWER WITH SILENT DELIGHT"],
  ["Tennyson", "Stars", "NOW SLEEPS THE CRIMSON PETAL NOW THE WHITE NOR WAVES THE CYPRESS"],
  ["Frost", "Desert Places", "THE LONELINESS INCLUDES ME UNAWARES AND SO I AM ALONE"],
  ["Shelley", "West Wind", "O WILD WEST WIND THOU BREATH OF AUTUMNS BEING"],
  ["Dickinson", "Wind", "THE WIND TAPPED LIKE A TIRED MAN AND QUIVERING STOOD"],
  ["Byron", "Storm", "THE CLOUDS ABOVE ARE DARK AND WILD AND SO IS MY SOUL"],
  ["Wordsworth", "Skylark", "UP WITH ME UP WITH ME INTO THE CLOUDS FOR THY SONG"],
  ["Shelley", "Lightning", "LIKE A CHILD FROM THE WOMB LIKE A GHOST FROM THE TOMB"],
  ["Longfellow", "Wind", "AND THE NIGHT SHALL BE FILLED WITH MUSIC AND THE CARES THAT"],
  ["Emerson", "Sky", "THE SKY IS THE DAILY BREAD OF THE EYES WHAT SCULPTURE IS"],
  ["Burns", "Red Rose", "O MY LOVE IS LIKE A RED RED ROSE THAT IS NEWLY SPRUNG IN JUNE"],
  ["Dickinson", "Flower", "TO MAKE A PRAIRIE IT TAKES A CLOVER AND ONE BEE"],
  ["Blake", "Garden", "HE WHO BINDS TO HIMSELF A JOY DOES THE WINGED LIFE DESTROY"],
  ["Keats", "Bower", "A BOWER QUIET FOR US AND A SLEEP FULL OF SWEET DREAMS"],
  ["Tennyson", "Garden", "COME INTO THE GARDEN MAUD FOR THE BLACK BAT NIGHT HAS FLOWN"],
  ["Whitman", "Leaf", "I BELIEVE A LEAF OF GRASS IS NO LESS THAN THE JOURNEY WORK OF STARS"],
  ["Blake", "Mountains", "GREAT THINGS ARE DONE WHEN MEN AND MOUNTAINS MEET"],
  ["Shelley", "Mont Blanc", "THE EVERLASTING UNIVERSE OF THINGS FLOWS THROUGH THE MIND"],
  ["Frost", "Mending Wall", "SOMETHING THERE IS THAT DOES NOT LOVE A WALL"],
  ["Wordsworth", "Mountains", "EARTH HAS NOT ANYTHING TO SHOW MORE FAIR DULL WOULD HE BE"],
  ["Coleridge", "Mountain", "ON THE WIDE LEVEL OF A MOUNTAIN HEAD I LIE AND THINK"],
  ["Byron", "Alps", "ABOVE ME ARE THE ALPS THE PALACES OF NATURE"],
  ["Emerson", "Earth", "THE EARTH LAUGHS IN FLOWERS WHEREVER THE SUN DOES SHINE"],
  ["Longfellow", "Forest", "THIS IS THE FOREST PRIMEVAL THE MURMURING PINES AND HEMLOCKS"],
  ["Chaucer", "Spring", "WHEN APRIL WITH HIS SHOWERS SWEET HAS PIERCED THE DROUGHT"],
  ["Dickinson", "Spring Light", "A LIGHT EXISTS IN SPRING NOT PRESENT ON THE YEAR AT ANY TIME"],
  ["Hopkins", "Spring", "NOTHING IS SO BEAUTIFUL AS SPRING WHEN WEEDS IN WHEELS SHOOT LONG"],
  ["Whitman", "Spring Song", "GIVE ME THE SPLENDID SILENT SUN WITH ALL HIS BEAMS FULL DAZZLING"],
  ["Shakespeare", "Spring Song", "WHEN DAISIES PIED AND VIOLETS BLUE AND LADY SMOCKS ALL SILVER"],
  ["Frost", "Spring Pools", "THESE POOLS THAT THOUGH IN FORESTS STILL REFLECT THE TOTAL SKY"],
  ["Dickinson", "Summer", "SOME KEEP THE SABBATH GOING TO CHURCH I KEEP IT STAYING HOME"],
  ["Tennyson", "Summer Night", "COME INTO THE GARDEN MAUD I AM HERE AT THE GATE ALONE"],
  ["Shakespeare", "Summer", "SHALL I COMPARE THEE TO A SUMMERS DAY THOU ART MORE LOVELY"],
  ["Whitman", "Sun", "GIVE ME THE SPLENDID SILENT SUN WITH ALL HIS BEAMS"],
  ["Byron", "Warm Day", "SHE WALKS IN BEAUTY LIKE THE NIGHT OF CLOUDLESS CLIMES"],
  ["Keats", "To Autumn", "WHERE ARE THE SONGS OF SPRING AY WHERE ARE THEY THINK NOT OF THEM"],
  ["Shelley", "Autumn Leaves", "O WILD WEST WIND THOU BREATH OF AUTUMNS BEING"],
  ["Frost", "After Apple", "AND I KEEP HEARING FROM THE CELLAR BIN THE RUMBLING SOUND"],
  ["Dickinson", "Autumn Light", "THE MORNS ARE MEEKER THAN THEY WERE THE NUTS ARE GETTING BROWN"],
  ["Longfellow", "Autumn Rain", "THE DAY IS COLD AND DARK AND DREARY IT RAINS AND THE WIND IS NEVER"],
  ["Burns", "Late Autumn", "THE PALE MOON IS SETTING BEYOND THE WHITE WAVE AND TIME IS SETTING"],
  ["Frost", "Stopping", "THE WOODS ARE LOVELY DARK AND DEEP BUT I HAVE PROMISES TO KEEP"],
  ["Blake", "Winter Song", "O WINTER BAR THINE ADAMANTINE DOORS THE NORTH IS THINE"],
  ["Coleridge", "Frost", "THE FROST PERFORMS ITS SECRET MINISTRY UNHELPED BY WIND"],
  ["Hardy", "Snow Storm", "EVERY BRANCH BIG WITH IT BENT EVERY TWIG WITH IT WEIGHT"],
  ["Keats", "Cold", "DEEP IN THE SHADY SADNESS OF A VALE FAR SUNKEN FROM THE SUN"],
  ["Tennyson", "Winter Night", "RING OUT WILD BELLS TO THE WILD SKY THE FLYING CLOUD THE FROSTY"],
  ["Keats", "Nightingale", "THOU WAST NOT BORN FOR DEATH IMMORTAL BIRD"],
  ["Shelley", "Skylark", "HAIL TO THEE BLITHE SPIRIT BIRD THOU NEVER WERT"],
  ["Dickinson", "Bird", "HOPE IS THE THING WITH FEATHERS THAT PERCHES IN THE SOUL"],
  ["Whitman", "Eagle", "THE DALLIANCE OF THE EAGLES THE RUSHING AMOROUS CONTACT"],
  ["Hardy", "Thrush", "AN AGED THRUSH FRAIL GAUNT AND SMALL IN BLAST BERUFFLED PLUME"],
  ["Yeats", "Wild Swans", "THE TREES ARE IN THEIR AUTUMN BEAUTY THE WOODLAND PATHS ARE DRY"],
  ["Blake", "Robin", "A ROBIN RED BREAST IN A CAGE PUTS ALL HEAVEN IN A RAGE"],
  ["Wordsworth", "Bird Song", "THE BIRDS AROUND ME HOPPED AND PLAYED THEIR THOUGHTS I CANNOT MEASURE"],
  ["Shelley", "Trees", "THE FLOWERS THAT SMILE TODAY TOMORROW DIE ALL THAT WE WISH TO STAY"],
  ["Longfellow", "Elm", "UNDER THE SPREADING CHESTNUT TREE THE VILLAGE SMITHY STANDS"],
  ["Blake", "Poison Tree", "I WAS ANGRY WITH MY FRIEND I TOLD MY WRATH MY WRATH DID END"],
  ["Whitman", "Live Oak", "I SAW IN LOUISIANA A LIVE OAK GROWING ALL ALONE IN A FIELD"],
  ["Keats", "Leaves", "WHERE ARE THE SONGS OF SPRING AY WHERE ARE THEY THINK NOT"],
  ["Shakespeare", "Time", "WHEN I DO COUNT THE CLOCK THAT TELLS THE TIME AND SEE"],
  ["Herrick", "Time", "GATHER YE ROSEBUDS WHILE YE MAY OLD TIME IS STILL A FLYING"],
  ["Dickinson", "Forever", "FOREVER IS COMPOSED OF NOWS ITS NOT A DIFFERENT TIME"],
  ["Shelley", "Time", "NOTHING BESIDE REMAINS ROUND THE DECAY OF THAT COLOSSAL WRECK"],
  ["Blake", "Eternity", "TO SEE A WORLD IN A GRAIN OF SAND AND A HEAVEN IN A WILD FLOWER"],
  ["Frost", "Road", "TWO ROADS DIVERGED IN A WOOD AND I TOOK THE ONE LESS TRAVELED"],
  ["Whitman", "Passage", "SAIL FORTH STEER FOR THE DEEP WATERS ONLY RECKLESS SOUL"],
  ["Tennyson", "Passing", "THE OLD ORDER CHANGETH YIELDING PLACE TO NEW AND GOD FULFILS"],
  ["Wordsworth", "Peace", "THE WORLD IS TOO MUCH WITH US LATE AND SOON GETTING AND SPENDING"],
  ["Dickinson", "Silence", "THERE IS A SOLITUDE OF SPACE A SOLITUDE OF SEA A SOLITUDE OF DEATH"],
  ["Blake", "Peace", "TO MERCY PITY PEACE AND LOVE ALL PRAY IN THEIR DISTRESS"],
  ["Frost", "Quiet Night", "I HAVE BEEN ONE ACQUAINTED WITH THE NIGHT I HAVE WALKED OUT"],
  ["Keats", "Stillness", "HEARD MELODIES ARE SWEET BUT THOSE UNHEARD ARE SWEETER STILL"],
  ["Shelley", "Calm", "MUSIC WHEN SOFT VOICES DIE VIBRATES IN THE MEMORY"],
  ["Shakespeare", "Sonnet", "SHALL I COMPARE THEE TO A SUMMERS DAY THOU ART MORE"],
  ["Browning", "Love", "HOW DO I LOVE THEE LET ME COUNT THE WAYS I LOVE THEE"],
  ["Burns", "My Love", "O MY LOVE IS LIKE A RED RED ROSE THAT IS NEWLY SPRUNG"],
  ["Dickinson", "Heart", "THE HEART ASKS PLEASURE FIRST AND THEN EXCUSE FROM PAIN"],
  ["Keats", "Love Letter", "I ALMOST WISH WE WERE BUTTERFLIES AND LIVED BUT THREE SUMMER DAYS"],
  ["Shelley", "Love Song", "THE FOUNTAINS MINGLE WITH THE RIVER AND THE RIVERS WITH THE OCEAN"],
  ["Tennyson", "Love", "IT IS BETTER TO HAVE LOVED AND LOST THAN NEVER TO HAVE LOVED"],
  ["Whitman", "Love Song", "I HEAR IT WAS CHARGED AGAINST ME THAT I SOUGHT TO DESTROY INSTITUTIONS"],
  ["Whitman", "Open Road", "AFOOT AND LIGHT HEARTED I TAKE TO THE OPEN ROAD HEALTHY FREE"],
  ["Shelley", "Journey", "THE CLOUD THAT TOOK THE FORM OF HOURS HAD ITS DWELLING THERE"],
  ["Dickinson", "Travel", "THERE IS NO FRIGATE LIKE A BOOK TO TAKE US LANDS AWAY"],
  ["Longfellow", "Journey", "LIVES OF GREAT MEN ALL REMIND US WE CAN MAKE OUR LIVES SUBLIME"],
  ["Blake", "Wander", "I WANDER THROUGH EACH CHARTERED STREET NEAR WHERE THE THAMES DOES"],
  ["Blake", "Morning", "TO SEE A WORLD IN A GRAIN OF SAND AND HEAVEN IN A WILD FLOWER"],
  ["Dickinson", "Light", "TELL ALL THE TRUTH BUT TELL IT SLANT SUCCESS IN CIRCUIT LIES"],
  ["Whitman", "Sunrise", "I TOO AM NOT A BIT TAMED I TOO AM UNTRANSLATABLE"],
  ["Shakespeare", "Dawn", "BUT LOOK THE MORN IN RUSSET MANTLE CLAD WALKS OVER THE DEW"],
  ["Keats", "Light", "A THING OF BEAUTY IS A JOY FOREVER ITS LOVELINESS INCREASES"],
  ["Frost", "Fire and Ice", "SOME SAY THE WORLD WILL END IN FIRE SOME SAY IN ICE"],
  ["Shelley", "Frozen", "MY SOUL IS AN ENCHANTED BOAT WHICH LIKE A SLEEPING SWAN"],
  ["Dickinson", "Snow", "IT SIFTS FROM LEADEN SIEVES IT POWDERS ALL THE WOOD"],
  ["Longfellow", "Ice", "UNDER THE WINTER SNOW THE SEEDS ARE SLEEPING SAFE AND WARM"],
  ["Blake", "Snow", "INNOCENCE DWELLS WITH WISDOM BUT NEVER WITH IGNORANCE"],
  ["Tennyson", "Frozen Lake", "DEEP AS FIRST LOVE AND WILD WITH ALL REGRET O DEATH IN LIFE"],
  ["Dickinson", "Bee", "TO MAKE A PRAIRIE IT TAKES A CLOVER AND ONE BEE ONE CLOVER"],
  ["Blake", "Tiger", "TIGER TIGER BURNING BRIGHT IN THE FORESTS OF THE NIGHT"],
  ["Keats", "Cricket", "THE POETRY OF EARTH IS NEVER DEAD WHEN ALL THE BIRDS ARE FAINT"],
  ["Shelley", "Skylark", "HAIL TO THEE BLITHE SPIRIT BIRD THOU NEVER WERT THAT FROM"],
  ["Whitman", "Spider", "A NOISELESS PATIENT SPIDER LAUNCHED FORTH FILAMENT OUT OF ITSELF"],
  ["Frost", "Design", "I FOUND A DIMPLED SPIDER FAT AND WHITE ON A WHITE HEAL ALL"],
  ["Dickinson", "Snake", "A NARROW FELLOW IN THE GRASS OCCASIONALLY RIDES YOU MAY HAVE MET"],
  ["Shakespeare", "Dream", "WE ARE SUCH STUFF AS DREAMS ARE MADE ON AND OUR LITTLE LIFE"],
  ["Keats", "Sleep", "O SOFT EMBALMER OF THE STILL MIDNIGHT SHUTTING WITH CAREFUL FINGERS"],
  ["Shelley", "Dreaming", "WE LOOK BEFORE AND AFTER AND PINE FOR WHAT IS NOT"],
  ["Coleridge", "Vision", "IN XANADU DID KUBLA KHAN A STATELY PLEASURE DOME DECREE"],
  ["Whitman", "Dream Song", "I DREAM IN MY DREAM ALL THE DREAMS OF THE OTHER DREAMERS"],
  ["Dickinson", "Dream", "TO MAKE A PRAIRIE IT TAKES A CLOVER AND A BEE AND REVERY"],
  ["Dickinson", "Truth", "TELL ALL THE TRUTH BUT TELL IT SLANT SUCCESS IN CIRCUIT LIES"],
  ["Shakespeare", "Knowledge", "THE FOOL DOTH THINK HE IS WISE BUT THE WISE MAN KNOWS HIMSELF"],
  ["Frost", "Revelation", "WE DANCE ROUND IN A RING AND SUPPOSE BUT THE SECRET SITS IN THE"],
  ["Whitman", "Wisdom", "HENCEFORTH I ASK NOT GOOD FORTUNE I MYSELF AM GOOD FORTUNE"],
  ["Tennyson", "Knowledge", "KNOWLEDGE COMES BUT WISDOM LINGERS AND I LINGER ON THE SHORE"],
  ["Keats", "Learning", "A THING OF BEAUTY IS A JOY FOREVER AND WILL NEVER PASS INTO NOTHING"],
  ["Frost", "Home", "HOME IS THE PLACE WHERE WHEN YOU HAVE TO GO THERE THEY HAVE TO"],
  ["Dickinson", "Memory", "MEMORY IS A STRANGE BELL JUBILEE AND KNELL THROUGH ALL THE ROOMS"],
  ["Longfellow", "Home", "STAY STAY AT HOME MY HEART AND REST HOME KEEPING HEARTS ARE HAPPIEST"],
  ["Tennyson", "Past", "TEARS IDLE TEARS I KNOW NOT WHAT THEY MEAN TEARS FROM THE DEPTH"],
  ["Wordsworth", "Memory", "THOUGH NOTHING CAN BRING BACK THE HOUR OF SPLENDOUR IN THE GRASS"],
  ["Burns", "Home", "FROM SCENES LIKE THESE OLD SCOTIAS GRANDEUR SPRINGS THAT MAKES HER"],
  ["Blake", "Fire", "BRING ME MY BOW OF BURNING GOLD BRING ME MY ARROWS OF DESIRE"],
  ["Shelley", "Prometheus", "THE CRAWLING GLACIERS PIERCE ME WITH THE SPEARS OF THEIR MOON"],
  ["Dickinson", "Flame", "DARE YOU SEE A SOUL AT THE WHITE HEAT THEN CROUCH WITHIN THE DOOR"],
  ["Keats", "Burn", "MY SPIRIT IS TOO WEAK MORTALITY WEIGHS HEAVILY ON ME LIKE UNWILLING"],
  ["Frost", "Fire", "SOME SAY THE WORLD WILL END IN FIRE SOME SAY IN ICE FROM WHAT IVE"],
  ["Byron", "Flame", "THE FIRE THAT ON MY BOSOM PREYS IS LONE AS SOME VOLCANIC ISLE"],
  ["Whitman", "Sea", "YOU SEA I RESIGN MYSELF TO YOU TOO I GUESS WHAT YOU MEAN"],
  ["Tennyson", "Sea Song", "BREAK BREAK BREAK ON THY COLD GRAY STONES O SEA AND I WOULD THAT"],
  ["Byron", "Ocean", "ROLL ON THOU DEEP AND DARK BLUE OCEAN ROLL TEN THOUSAND FLEETS"],
  ["Dickinson", "Shore", "I STARTED EARLY TOOK MY DOG AND VISITED THE SEA THE MERMAIDS"],
  ["Shelley", "Sea", "IT IS THE UNPASTURED SEA HUNGERING FOR CALM AND FED WITH MORNING"],
  ["Longfellow", "Tide", "THE TIDE RISES THE TIDE FALLS THE TWILIGHT DARKENS THE CURLEW CALLS"],
  ["Dickinson", "Morning", "WILL THERE REALLY BE A MORNING IS THERE SUCH A THING AS DAY"],
  ["Keats", "Evening Star", "BRIGHT STAR WOULD I WERE STEADFAST AS THOU ART IN SPLENDOUR"],
  ["Whitman", "Evening", "DAREST THOU NOW O SOUL WALK OUT WITH ME TOWARD THE UNKNOWN REGION"],
  ["Frost", "Twilight", "I HAVE BEEN ONE ACQUAINTED WITH THE NIGHT I HAVE OUTWALKED THE"],
  ["Shelley", "Sunset", "THE DAY BECOMES MORE SOLEMN AND SERENE WHEN NOON IS PAST"],
  ["Tennyson", "Vespers", "SUNSET AND EVENING STAR AND ONE CLEAR CALL FOR ME AND MAY THERE BE"],
  ["Dickinson", "Solitude", "THE SOUL SELECTS HER OWN SOCIETY THEN SHUTS THE DOOR"],
  ["Whitman", "Alone", "I CELEBRATE MYSELF AND SING MYSELF AND WHAT I ASSUME"],
  ["Keats", "Solitude", "O SOLITUDE IF I MUST WITH THEE DWELL LET IT NOT BE AMONG"],
  ["Tennyson", "Alone", "I AM A PART OF ALL THAT I HAVE MET YET ALL EXPERIENCE IS AN"],
  ["Longfellow", "Rainy Day", "INTO EACH LIFE SOME RAIN MUST FALL SOME DAYS MUST BE DARK AND DREARY"],
  ["Dickinson", "Rain", "LIKE RAIN IT SOUNDED TILL IT CURVED AND THEN I KNEW THE FORM"],
  ["Burns", "Rainy Day", "THE PALE MOON IS SETTING BEYOND THE WHITE WAVE AND TIME IS SETTING"],
  ["Blake", "Rain", "AND DID THOSE FEET IN ANCIENT TIME WALK UPON ENGLANDS MOUNTAINS"],
  ["Frost", "After Rain", "IT TOOK THE SEA AND ME A LONG LONG TIME TO LEARN EACH OTHERS WAY"],
  ["Shelley", "Rain Fall", "I BRING FRESH SHOWERS FOR THE THIRSTING FLOWERS FROM THE SEAS"],
  ["Dickinson", "Firefly", "THE LIGHTNING IS A YELLOW FORK FROM TABLES IN THE SKY"],
  ["Blake", "Fly", "AM NOT I A FLY LIKE THEE OR ART NOT THOU A MAN LIKE ME"],
  ["Keats", "Bee Song", "THE MURMUROUS HAUNT OF FLIES ON SUMMER EVES CANNOT RECALL"],
  ["Shelley", "Moth", "THE DESIRE OF THE MOTH FOR THE STAR OF THE NIGHT FOR THE MORROW"],
  ["Whitman", "Insect", "I BELIEVE A LEAF OF GRASS IS NO LESS THAN THE JOURNEY WORK"],
  ["Burns", "Harvest", "WHEN CHILL NOVEMBER BLEAK AND CHEERLESS CAME AND BITING"],
  ["Keats", "Feast", "FOR SUMMER HAS OVER BRIMMED THEIR CLAMMY CELLS AND BUDDING FRUITS"],
  ["Dickinson", "Bread", "SOME KEEP THE SABBATH GOING TO CHURCH I KEEP IT STAYING AT HOME"],
  ["Frost", "Apples", "AFTER APPLE PICKING MY LONG TWO POINTED LADDER IS STICKING THROUGH"],
  ["Blake", "Grain", "TO SEE A WORLD IN A GRAIN OF SAND AND A HEAVEN IN A WILD"],
  ["Shelley", "Feast", "MY SOUL IS AN ENCHANTED BOAT WHICH LIKE A SLEEPING SWAN DOTH"],
  ["Shakespeare", "Night", "GOOD NIGHT GOOD NIGHT PARTING IS SUCH SWEET SORROW THAT I SHALL"],
  ["Shelley", "Darkness", "WHEN THE LAMP IS SHATTERED THE LIGHT IN THE DUST LIES DEAD"],
  ["Dickinson", "Night", "WE GROW ACCUSTOMED TO THE DARK WHEN LIGHT IS PUT AWAY"],
  ["Frost", "Night", "ACQUAINTED WITH THE NIGHT I HAVE WALKED OUT IN RAIN AND BACK"],
  ["Blake", "Night", "THE STARS THREW DOWN THEIR SPEARS AND WATERED HEAVEN WITH THEIR"],
  ["Keats", "Darkness", "DARKLING I LISTEN AND FOR MANY A TIME I HAVE BEEN HALF IN LOVE"],
  ["Blake", "Gold", "HE WHO BINDS TO HIMSELF A JOY DOES THE WINGED LIFE DESTROY"],
  ["Shakespeare", "Green", "WHEN DAISIES PIED AND VIOLETS BLUE AND LADY SMOCKS ALL SILVER WHITE"],
  ["Shelley", "Colors", "LIFE LIKE A DOME OF MANY COLOURED GLASS STAINS THE WHITE RADIANCE"],
  ["Dickinson", "Purple", "SHE SWEEPS WITH MANY COLORED BROOMS AND LEAVES THE SHREDS BEHIND"],
  ["Whitman", "Hues", "GIVE ME THE SPLENDID SILENT SUN WITH ALL HIS BEAMS FULL DAZZLING"],
  ["Frost", "Growth", "NATURE IS ALWAYS HINTING AT US IT HINTS OVER AND OVER AGAIN"],
  ["Dickinson", "Bloom", "A WORD IS DEAD WHEN IT IS SAID SOME SAY I SAY IT JUST BEGINS"],
  ["Shelley", "Spring Growth", "THE FLOWERS THAT SMILE TODAY TOMORROW DIE ALL THAT WE WISH TO"],
  ["Whitman", "Grass", "A CHILD SAID WHAT IS THE GRASS FETCHING IT TO ME WITH FULL HANDS"],
  ["Keats", "Growth", "THE POETRY OF EARTH IS NEVER DEAD WHEN ALL THE BIRDS ARE FAINT"],
  ["Shelley", "Art", "POETRY LIFTS THE VEIL FROM THE HIDDEN BEAUTY OF THE WORLD"],
  ["Dickinson", "Work", "I DWELL IN POSSIBILITY A FAIRER HOUSE THAN PROSE MORE NUMEROUS"],
  ["Whitman", "Craft", "I HEAR AMERICA SINGING THE VARIED CAROLS I HEAR EACH SINGING"],
  ["Shakespeare", "Music", "IF MUSIC BE THE FOOD OF LOVE PLAY ON GIVE ME EXCESS OF IT"],
  ["Shelley", "Music", "MUSIC WHEN SOFT VOICES DIE VIBRATES IN THE MEMORY ODOURS"],
  ["Blake", "Song", "AND DID THOSE FEET IN ANCIENT TIME WALK UPON ENGLANDS MOUNTAINS"],
  ["Dickinson", "Sound", "A WORD IS DEAD WHEN IT IS SAID SOME SAY I SAY IT JUST BEGINS TO"],
  ["Keats", "Melody", "HEARD MELODIES ARE SWEET BUT THOSE UNHEARD ARE SWEETER STILL PLAY"],
  ["Whitman", "Sing", "I HEAR AMERICA SINGING THE VARIED CAROLS I HEAR THOSE OF MECHANICS"],
  ["Blake", "Child", "PIPING DOWN THE VALLEYS WILD PIPING SONGS OF PLEASANT GLEE"],
  ["Wordsworth", "Child", "THE CHILD IS FATHER OF THE MAN AND I COULD WISH MY DAYS TO BE"],
  ["Dickinson", "Youth", "WE NEVER KNOW HOW HIGH WE ARE TILL WE ARE CALLED TO RISE"],
  ["Frost", "Child", "THE LAND WAS OURS BEFORE WE WERE THE LANDS SHE WAS OUR LAND"],
  ["Shelley", "Youth", "WHEN THE LAMP IS SHATTERED THE LIGHT IN THE DUST LIES DEAD WHEN"],
  ["Tennyson", "Youth", "IN THE SPRING A YOUNG MANS FANCY LIGHTLY TURNS TO THOUGHTS OF LOVE"],
  ["Shakespeare", "Endings", "ALL THE WORLDS A STAGE AND ALL THE MEN AND WOMEN MERELY PLAYERS"],
  ["Dickinson", "Begin", "I AM NOBODY WHO ARE YOU ARE YOU NOBODY TOO THEN THERES A PAIR"],
  ["Shelley", "Rebirth", "THE TRUMPET OF A PROPHECY O WIND IF WINTER COMES CAN SPRING"],
  ["Tennyson", "End", "THE OLD ORDER CHANGETH YIELDING PLACE TO NEW AND GOD FULFILS HIMSELF"],
  ["Frost", "New Day", "IN THREE WORDS I CAN SUM UP EVERYTHING ABOUT LIFE IT GOES ON"],
  ["Whitman", "Renewal", "HENCEFORTH I ASK NOT GOOD FORTUNE I MYSELF AM GOOD FORTUNE HENCEFORTH"],
  ["Shakespeare", "Age", "WHEN FORTY WINTERS SHALL BESIEGE THY BROW AND DIG DEEP TRENCHES"],
  ["Yeats", "Old Age", "WHEN YOU ARE OLD AND GREY AND FULL OF SLEEP AND NODDING BY THE FIRE"],
  ["Frost", "Years", "THE AFTERNOON KNOWS WHAT THE MORNING NEVER SUSPECTED AT ALL"],
  ["Dickinson", "Time", "BECAUSE I COULD NOT STOP FOR DEATH HE KINDLY STOPPED FOR ME"],
  ["Tennyson", "Late Years", "OLD AGE HATH YET HIS HONOUR AND HIS TOIL DEATH CLOSES ALL"],
  ["Longfellow", "Twilight", "THE DAY IS DONE AND THE DARKNESS FALLS FROM THE WINGS OF NIGHT"],
  ["Tennyson", "River", "I COME FROM HAUNTS OF COOT AND HERN I MAKE A SUDDEN SALLY"],
  ["Burns", "River", "FLOW GENTLY SWEET AFTON AMONG THY GREEN BRAES FLOW GENTLY"],
  ["Shelley", "River Song", "THE FOUNTAINS MINGLE WITH THE RIVER AND THE RIVERS WITH THE OCEAN"],
  ["Whitman", "River", "JUST AS YOU FEEL WHEN YOU LOOK ON THE RIVER AND SKY SO I FELT"],
  ["Keats", "Stream", "WHERE SHALL I LEARN TO GET MY PEACE AGAIN TO BANISH THOUGHTS"],
  ["Blake", "Play", "IN THE MORNING I RISE WITH THE LARK AND IN THE EVENING SING"],
  ["Dickinson", "Game", "I TOOK ONE DRAUGHT OF LIFE I TELL YOU WHAT I PAID AND WHAT IT WAS"],
  ["Shelley", "Childhood", "WE LOOK BEFORE AND AFTER AND PINE FOR WHAT IS NOT OUR SINCEREST"],
  ["Blake", "Thankful", "CAN I SEE ANOTHERS WOE AND NOT BE IN SORROW TOO CAN I SEE"],
  ["Dickinson", "Joy", "I FIND ECSTASY IN LIVING THE MERE SENSE OF LIVING IS JOY ENOUGH"],
  ["Keats", "Happiness", "A THING OF BEAUTY IS A JOY FOREVER ITS LOVELINESS INCREASES NEVER"],
  ["Whitman", "Grateful", "I EXIST AS I AM THAT IS ENOUGH IF NO OTHER IN THE WORLD BE AWARE"],
  ["Shelley", "Cloud", "I AM THE DAUGHTER OF EARTH AND WATER AND THE NURSLING OF THE SKY"],
  ["Keats", "Cloud", "THE POETRY OF EARTH IS CEASING NEVER ON A LONE WINTER EVENING WHEN"],
  ["Wordsworth", "Cloud", "I WANDERED LONELY AS A CLOUD THAT FLOATS ON HIGH OERVALES AND HILLS"],
  ["Dickinson", "Sky", "THERE IS ANOTHER SKY EVER SERENE AND FAIR AND THERE IS ANOTHER"],
  ["Shelley", "Ruins", "NOTHING BESIDE REMAINS ROUND THE DECAY OF THAT COLOSSAL WRECK"],
  ["Dickinson", "Stone", "HOW HAPPY IS THE LITTLE STONE THAT RAMBLES IN THE ROAD ALONE"],
  ["Whitman", "Earth", "PRESS CLOSE BARE BOSOMED NIGHT PRESS CLOSE MAGNETIC NOURISHING"],
  ["Longfellow", "Bridge", "I STOOD ON THE BRIDGE AT MIDNIGHT AS THE CLOCKS WERE STRIKING"],
  ["Blake", "Crossing", "THE ROAD OF EXCESS LEADS TO THE PALACE OF WISDOM AND TRUTH"],
  ["Dickinson", "Crossing", "EXULTATION IS THE GOING OF AN INLAND SOUL TO SEA PAST THE HOUSES"],
  ["Tennyson", "Twilight", "SUNSET AND EVENING STAR AND ONE CLEAR CALL FOR ME AND MAY THERE"],
  ["Dickinson", "Evening", "THERE CAME A WIND LIKE A BUGLE IT QUIVERED THROUGH THE GRASS"],
  ["Shelley", "Night Falls", "SWIFTLY WALK OVER THE WESTERN WAVE SPIRIT OF NIGHT AND FROM"],
  ["Shelley", "Desert", "NOTHING BESIDE REMAINS ROUND THE DECAY OF THAT COLOSSAL WRECK BOUNDLESS"],
  ["Dickinson", "Sand", "THE BRAIN IS WIDER THAN THE SKY FOR PUT THEM SIDE BY SIDE"],
  ["Byron", "Desert Sun", "THE ASSYRIAN CAME DOWN LIKE THE WOLF ON THE FOLD AND HIS COHORTS"],
  ["Blake", "Innocence", "TO SEE A WORLD IN A GRAIN OF SAND AND A HEAVEN IN WILDFLOWER"],
  ["Keats", "Urn", "THOU STILL UNRAVISHED BRIDE OF QUIETNESS THOU FOSTER CHILD"],
  ["Dickinson", "Needle", "I FELT A FUNERAL IN MY BRAIN AND MOURNERS TO AND FRO KEPT"],
  ["Whitman", "Fishing", "I THINK I COULD TURN AND LIVE WITH ANIMALS THEY ARE SO PLACID"],
  ["Tennyson", "Fisher", "SUNSET AND EVENING STAR AND ONE CLEAR CALL FOR ME AT SEA"],
  ["Dickinson", "Water", "WE NEVER KNOW HOW HIGH WE ARE TILL WE ARE CALLED TO RISE AND THEN"],
  ["Shelley", "Compass", "THE GREAT INSTRUMENT OF MORAL GOOD IS THE IMAGINATION ALONE"],
  ["Blake", "Direction", "IF THE SUN AND MOON SHOULD DOUBT THEY WOULD IMMEDIATELY GO OUT"],
  ["Frost", "Paths", "HOME IS THE PLACE WHERE WHEN YOU HAVE TO GO THERE THEY TAKE YOU"],
  ["Dickinson", "Navigate", "NOT KNOWING WHEN THE DAWN WILL COME I OPEN EVERY DOOR AND WAIT"],
  ["Dickinson", "Thread", "I FELT A CLEAVING IN MY MIND AS IF MY BRAIN HAD SPLIT AND JOINED"],
  ["Blake", "Weave", "BRING ME MY BOW OF BURNING GOLD BRING ME MY ARROWS OF DESIRE TO"],
  ["Shelley", "Tapestry", "LIFE LIKE A DOME OF MANY COLOURED GLASS STAINS THE WHITE RADIANCE"],
  ["Keats", "Weaving", "A THING OF BEAUTY IS A JOY FOREVER ITS LOVELINESS INCREASES AND WILL"],
  ["Whitman", "Ship", "O CAPTAIN MY CAPTAIN OUR FEARFUL TRIP IS DONE THE SHIP HAS"],
  ["Tennyson", "Sailing", "COME MY FRIENDS IT IS NOT TOO LATE TO SEEK A NEWER WORLD PUSH OFF"],
  ["Frost", "Boat", "TWO LOOK AT TWO EACH ONE WHAT EACH ONE WAS AND THE WALL BETWEEN"],
  ["Shelley", "Voyage", "WE ARE AS CLOUDS THAT VEIL THE MIDNIGHT MOON HOW RESTLESSLY THEY"],
  ["Blake", "Air", "THE THANKLESS MUSE BEGINS HER MORNING TASK AND WAKES THE WORLD"],
  ["Shelley", "Breath", "IF WINTER COMES CAN SPRING BE FAR BEHIND THE TRUMPET OF PROPHECY"],
  ["Dickinson", "Air", "TELL ALL THE TRUTH BUT TELL IT SLANT SUCCESS IN CIRCUIT LIES IN"],
  ["Keats", "Breath", "BRIGHT STAR WOULD I WERE STEADFAST AS THOU ART IN SPLENDOUR HUNG"],
  ["Dickinson", "Friend", "MY FRIENDS ARE MY ESTATE FORGIVE ME THEN THE AVARICE TO HOARD THEM"],
  ["Shakespeare", "Friend", "THOSE FRIENDS THOU HAST AND THEIR ADOPTION TRIED GRAPPLE THEM TO"],
  ["Whitman", "Companion", "I AND MY FANCY FREE THE ROAD IS BEFORE US GIVING EVERYTHING TO ALL"],
  ["Longfellow", "Patience", "THE HEIGHTS BY GREAT MEN REACHED AND KEPT WERE NOT ATTAINED"],
  ["Dickinson", "Waiting", "THEY SAY THAT TIME ASSUAGES TIME NEVER DID ASSUAGE AN ACTUAL"],
  ["Shelley", "Mutability", "WE ARE AS CLOUDS THAT VEIL THE MIDNIGHT MOON HOW RESTLESSLY"],
  ["Shakespeare", "Fleeting", "LIKE AS THE WAVES MAKE TOWARDS THE PEBBLED SHORE SO DO OUR MINUTES"],
  ["Keats", "Passing", "WHERE ARE THE SONGS OF SPRING AY WHERE ARE THEY THINK NOT"],
  ["Frost", "Nothing Gold", "NATURES FIRST GREEN IS GOLD HER HARDEST HUE TO HOLD"],
  ["Blake", "Inquiry", "THE TIGERS OF WRATH ARE WISER THAN THE HORSES OF INSTRUCTION"],
  ["Dickinson", "Learning", "SURGEONS MUST BE VERY CAREFUL WHEN THEY TAKE THE KNIFE BENEATH"],
  ["Frost", "Teaching", "EDUCATION IS THE ABILITY TO LISTEN TO ALMOST ANYTHING WITHOUT"],
  ["Shakespeare", "Stars", "DOUBT THOU THE STARS ARE FIRE DOUBT THE SUN DOTH MOVE DOUBT TRUTH"],
  ["Whitman", "Cosmos", "A VAST SIMILITUDE INTERLOCKS ALL AND SHALL FOREVER SPAN THEM"],
  ["Tennyson", "Stars", "MANY A NIGHT I SAW THE PLEIADS RISING THROUGH THE MELLOW SHADE"],
  ["Shakespeare", "Courage", "COWARDS DIE MANY TIMES BEFORE THEIR DEATHS THE VALIANT NEVER"],
  ["Shelley", "Brave", "THE SOUL OF MAN IS LIKE THE ROLLING WORLD ONE HALF IN DAY THE OTHER"],
  ["Dickinson", "Daring", "WE NEVER KNOW HOW HIGH WE ARE TILL WE ARE CALLED TO RISE AND THEN"],
  ["Whitman", "Strength", "KEEP YOUR FACE ALWAYS TOWARD THE SUNSHINE AND SHADOWS WILL FALL"],
  ["Tennyson", "Bells", "RING OUT WILD BELLS TO THE WILD SKY THE FLYING CLOUD THE FROSTY LIGHT"],
  ["Dickinson", "Clock", "A CLOCK STOPPED NOT THE MANTELS GENEVA DOCTOR NUMB THE PULSE OF"],
  ["Wordsworth", "Field", "A HOST OF GOLDEN DAFFODILS BESIDE THE LAKE BENEATH THE TREES"],
  ["Burns", "Field", "NOW SPRING HAS CLAD THE GROVE IN GREEN AND STREWED THE LEA WITH"],
  ["Whitman", "Prairie", "GIVE ME THE SPLENDID SILENT SUN WITH ALL HIS BEAMS FULL"],
  ["Dickinson", "Meadow", "I TASTE A LIQUOR NEVER BREWED FROM TANKARDS SCOOPED IN PEARL"],
  ["Shelley", "Echo", "MAKE ME THY LYRE EVEN AS THE FOREST IS WHAT IF MY LEAVES ARE FALLING"],
  ["Shakespeare", "Sound", "THE QUALITY OF MERCY IS NOT STRAINED IT DROPPETH AS THE GENTLE"],
  ["Keats", "Echo", "MY HEART ACHES AND A DROWSY NUMBNESS PAINS MY SENSE AS THOUGH"],
  ["Whitman", "Resonance", "I SOUND MY BARBARIC YAWP OVER THE ROOFTOPS OF THE WORLD AT LARGE"],
  ["Blake", "Door", "IF THE DOORS OF PERCEPTION WERE CLEANSED EVERYTHING WOULD APPEAR"],
  ["Dickinson", "Door", "I NEVER SAW A MOOR I NEVER SAW THE SEA YET KNOW I HOW THE"],
  ["Tennyson", "Threshold", "COME MY FRIENDS IT IS NOT TOO LATE TO SEEK A NEWER WORLD AND"],
  ["Shelley", "Mist", "AWAY THE MOOR IS DARK BENEATH THE MOON RAPID CLOUDS HAVE DRUNK"],
  ["Whitman", "Mist", "I AM HE THAT WALKS WITH THE TENDER AND GROWING NIGHT PRESS CLOSE"],
  ["Blake", "Shadow", "FOR MERCY HAS A HUMAN HEART PITY A HUMAN FACE AND LOVE THE HUMAN"],
  ["Shakespeare", "Shade", "IF WE SHADOWS HAVE OFFENDED THINK BUT THIS AND ALL IS MENDED"],
  ["Shelley", "Shadow", "THE ONE REMAINS THE MANY CHANGE AND PASS HEAVENS LIGHT FOREVER"],
  ["Dickinson", "Shadow", "THERE IS A CERTAIN SLANT OF LIGHT WINTER AFTERNOONS THAT OPPRESSES"],
  ["Blake", "Soil", "TO CREATE A LITTLE FLOWER IS THE LABOUR OF AGES BUT TO HOLD IT"],
  ["Dickinson", "Seeds", "FAME IS A BEE IT HAS A SONG IT HAS A STING AH TOO IT HAS A WING"],
  ["Frost", "Sowing", "NATURE IS ALWAYS HINTING AT US IT HINTS OVER AND OVER AND OVER"],
  ["Shelley", "Growth", "IF WINTER COMES CAN SPRING BE FAR BEHIND O WILD WEST WIND THOU"],
  ["Whitman", "Hands", "IS THIS THEN A TOUCH QUIVERING ME TO A NEW IDENTITY FLAMES"],
  ["Burns", "Labour", "TO SEE HER IS TO LOVE HER AND LOVE BUT HER FOREVER FOR NATURE"],
  ["Dickinson", "Touch", "I FELT A FUNERAL IN MY BRAIN AND MOURNERS TO AND FRO THEY KEPT"],
  ["Keats", "Hands", "WHEN I HAVE FEARS THAT I MAY CEASE TO BE BEFORE MY PEN HAS GLEANED"],
  ["Frost", "Spring", "I HAVE BEEN ONE ACQUAINTED WITH THE NIGHT I WALKED OUT IN RAIN"],
  ["Dickinson", "Well", "A WELL A WELL A DEEP WELL IT IS WHOSE WATERS LIE BELOW ALL"],
  ["Shelley", "Source", "MY SOUL IS AN ENCHANTED BOAT WHICH LIKE A SLEEPING SWAN DOTH FLOAT"],
  ["Shakespeare", "Dust", "GOLDEN LADS AND GIRLS ALL MUST AS CHIMNEY SWEEPERS COME TO DUST"],
  ["Dickinson", "Dust", "AMPLE MAKE THIS BED MAKE THIS BED WITH AWE IN IT WAIT TILL JUDGMENT"],
  ["Frost", "Ashes", "THE WAY A CROW SHOOK DOWN ON ME DUST OF SNOW FROM HEMLOCK TREE"],
  ["Frost", "Wall", "SOMETHING THERE IS THAT DOES NOT LOVE A WALL THAT SENDS THE FROZEN"],
  ["Dickinson", "Boundary", "THE SOUL SELECTS HER OWN SOCIETY THEN SHUTS THE DOOR ON HER DIVINE"],
  ["Shelley", "Ruin", "MY NAME IS OZYMANDIAS KING OF KINGS LOOK ON MY WORKS YE MIGHTY"],
  ["Blake", "Garden Wall", "A ROBIN RED BREAST IN A CAGE PUTS ALL HEAVEN IN A RAGE AND FURY"],
  ["Longfellow", "Stairs", "THE HEIGHTS BY GREAT MEN REACHED AND KEPT WERE NOT ATTAINED BY"],
  ["Dickinson", "Ascent", "WE NEVER KNOW HOW HIGH WE ARE TILL WE ARE ASKED TO RISE AND THEN"],
  ["Shelley", "Climb", "THE SOUL OF MAN IS LIKE THE ROLLING WORLD ONE HALF IN DAY THE"],
  ["Shakespeare", "Mirror", "ALL THE WORLDS A STAGE AND ALL THE MEN AND WOMEN MERELY PLAYERS"],
  ["Shelley", "Reflection", "LIFE LIKE A DOME OF MANY COLOURED GLASS STAINS THE WHITE"],
  ["Dickinson", "Glass", "TELL ALL THE TRUTH BUT TELL IT SLANT SUCCESS IN CIRCUIT LIES IN"],
  ["Keats", "Seeing", "THEN FELT I LIKE SOME WATCHER OF THE SKIES WHEN A NEW PLANET SWIMS"],
  ["Dickinson", "Candle", "THE SOUL SHOULD ALWAYS STAND AJAR THAT IF THE HEAVEN INQUIRE"],
  ["Shelley", "Light", "THE DESIRE OF THE MOTH FOR THE STAR OF THE NIGHT FOR THE MORROW"],
  ["Whitman", "Road", "AFOOT AND LIGHT HEARTED I TAKE TO THE OPEN ROAD HEALTHY AND FREE"],
  ["Dickinson", "Wheel", "I FELT A FUNERAL IN MY BRAIN AND MOURNERS TO AND FRO KEPT TREADING"],
  ["Shelley", "Journey", "NOTHING IN THE WORLD IS SINGLE ALL THINGS BY A LAW DIVINE IN ONE"],
  ["Shakespeare", "Sonnet 18", "THOU ART MORE LOVELY AND MORE TEMPERATE"],
  ["Shakespeare", "Sonnet 116", "LET ME NOT TO THE MARRIAGE OF TRUE MINDS"],
  ["Shakespeare", "Sonnet 116", "LOVE IS NOT LOVE WHICH ALTERS WHEN IT ALTERATION FINDS"],
  ["Shakespeare", "Sonnet 130", "MY MISTRESS EYES ARE NOTHING LIKE THE SUN"],
  ["Shakespeare", "Sonnet 73", "THAT TIME OF YEAR THOU MAYST IN ME BEHOLD"],
  ["Shakespeare", "Sonnet 29", "WHEN IN DISGRACE WITH FORTUNE AND MENS EYES"],
  ["Shakespeare", "Sonnet 1", "FROM FAIREST CREATURES WE DESIRE INCREASE"],
  ["Shakespeare", "Sonnet 94", "THEY THAT HAVE POWER TO HURT AND WILL DO NONE"],
  ["Shakespeare", "Sonnet 55", "NOT MARBLE NOR THE GILDED MONUMENTS"],
  ["Shakespeare", "Sonnet 30", "WHEN TO THE SESSIONS OF SWEET SILENT THOUGHT"],
  ["Shakespeare", "Sonnet 138", "WHEN MY LOVE SWEARS THAT SHE IS MADE OF TRUTH"],
  ["Shakespeare", "Sonnet 147", "MY LOVE IS AS A FEVER LONGING STILL"],
  ["Shakespeare", "Sonnet 71", "NO LONGER MOURN FOR ME WHEN I AM DEAD"],
  ["Keats", "Ode on a Grecian Urn", "BEAUTY IS TRUTH TRUTH IS BEAUTY THAT IS ALL YE KNOW"],
  ["Keats", "To Autumn", "SEASON OF MISTS AND MELLOW FRUITFULNESS"],
  ["Keats", "On First Looking into Chapman's Homer", "MUCH HAVE I TRAVELLED IN THE REALMS OF GOLD"],
  ["Keats", "La Belle Dame sans Merci", "O WHAT CAN AIL THEE KNIGHT AT ARMS"],
  ["Keats", "Bright Star", "BRIGHT STAR WOULD I WERE STEDFAST AS THOU ART"],
  ["Shelley", "Ozymandias", "I MET A TRAVELLER FROM AN ANTIQUE LAND"],
  ["Shelley", "Ozymandias", "LOOK ON MY WORKS YE MIGHTY AND DESPAIR"],
  ["Shelley", "To a Skylark", "OUR SWEETEST SONGS ARE THOSE THAT TELL OF SADDEST THOUGHT"],
  ["Byron", "She Walks in Beauty", "OF CLOUDLESS CLIMES AND STARRY SKIES"],
  ["Byron", "When We Two Parted", "WHEN WE TWO PARTED IN SILENCE AND TEARS"],
  ["Byron", "So We'll Go No More a Roving", "SO WELL GO NO MORE A ROVING SO LATE INTO THE NIGHT"],
  ["Byron", "Darkness", "I HAD A DREAM WHICH WAS NOT ALL A DREAM"],
  ["Wordsworth", "Lines Composed a Few Miles above Tintern Abbey", "FIVE YEARS HAVE PAST FIVE SUMMERS WITH THE LENGTH OF FIVE LONG WINTERS"],
  ["Wordsworth", "My Heart Leaps Up", "MY HEART LEAPS UP WHEN I BEHOLD A RAINBOW IN THE SKY"],
  ["Wordsworth", "Ode: Intimations of Immortality", "THERE WAS A TIME WHEN MEADOW GROVE AND STREAM"],
  ["Wordsworth", "Ode: Intimations of Immortality", "THE THINGS WHICH I HAVE SEEN I NOW CAN SEE NO MORE"],
  ["Wordsworth", "The Solitary Reaper", "BEHOLD HER SINGLE IN THE FIELD YON SOLITARY HIGHLAND LASS"],
  ["Blake", "The Tyger", "TYGER TYGER BURNING BRIGHT IN THE FORESTS OF THE NIGHT"],
  ["Blake", "The Tyger", "WHAT IMMORTAL HAND OR EYE COULD FRAME THY FEARFUL SYMMETRY"],
  ["Blake", "Auguries of Innocence", "AND A HEAVEN IN A WILD FLOWER HOLD INFINITY IN THE PALM"],
  ["Blake", "The Lamb", "LITTLE LAMB WHO MADE THEE DOST THOU KNOW WHO MADE THEE"],
  ["Blake", "The Sick Rose", "O ROSE THOU ART SICK THE INVISIBLE WORM"],
  ["Dickinson", "I'm Nobody! Who are you?", "IM NOBODY WHO ARE YOU ARE YOU NOBODY TOO"],
  ["Dickinson", "A Bird came down the Walk", "A BIRD CAME DOWN THE WALK HE DID NOT KNOW I SAW"],
  ["Dickinson", "Wild Nights", "WILD NIGHTS WILD NIGHTS WERE I WITH THEE"],
  ["Dickinson", "Success is counted sweetest", "SUCCESS IS COUNTED SWEETEST BY THOSE WHO NEER SUCCEED"],
  ["Dickinson", "There's a certain Slant of light", "THERES A CERTAIN SLANT OF LIGHT WINTER AFTERNOONS"],
  ["Whitman", "Song of Myself", "I AM LARGE I CONTAIN MULTITUDES"],
  ["Whitman", "When I Heard the Learn'd Astronomer", "WHEN I HEARD THE LEARND ASTRONOMER AND THE PROOFS WERE RANGED BEFORE ME"],
  ["Frost", "The Road Not Taken", "TWO ROADS DIVERGED IN A YELLOW WOOD"],
  ["Frost", "The Road Not Taken", "I TOOK THE ONE LESS TRAVELED BY AND THAT HAS MADE ALL THE DIFFERENCE"],
  ["Frost", "Stopping by Woods on a Snowy Evening", "WHOSE WOODS THESE ARE I THINK I KNOW"],
  ["Frost", "Stopping by Woods on a Snowy Evening", "AND MILES TO GO BEFORE I SLEEP"],
  ["Frost", "Mending Wall", "SOMETHING THERE IS THAT DOESNT LOVE A WALL"],
  ["Frost", "Mending Wall", "GOOD FENCES MAKE GOOD NEIGHBORS HE WOULD OFTEN SAY"],
  ["Frost", "Birches", "WHEN I SEE BIRCHES BEND TO LEFT AND RIGHT"],
  ["Frost", "After Apple-Picking", "MY LONG TWO POINTED LADDERS STICKING THROUGH A TREE"],
  ["Tennyson", "The Charge of the Light Brigade", "HALF A LEAGUE HALF A LEAGUE HALF A LEAGUE ONWARD"],
  ["Tennyson", "The Charge of the Light Brigade", "INTO THE VALLEY OF DEATH RODE THE SIX HUNDRED"],
  ["Tennyson", "Ulysses", "TO STRIVE TO SEEK TO FIND AND NOT TO YIELD"],
  ["Tennyson", "In Memoriam A.H.H.", "TIS BETTER TO HAVE LOVED AND LOST THAN NEVER TO HAVE LOVED AT ALL"],
  ["Tennyson", "The Lady of Shalott", "ON EITHER SIDE THE RIVER LIE LONG FIELDS OF BARLEY AND OF RYE"],
  ["Tennyson", "The Eagle", "HE CLASPS THE CRAG WITH CROOKED HANDS CLOSE TO THE SUN IN LONELY LANDS"],
  ["Longfellow", "Paul Revere's Ride", "LISTEN MY CHILDREN AND YOU SHALL HEAR OF THE MIDNIGHT RIDE"],
  ["Longfellow", "A Psalm of Life", "TELL ME NOT IN MOURNFUL NUMBERS LIFE IS BUT AN EMPTY DREAM"],
  ["Longfellow", "A Psalm of Life", "LIFE IS REAL LIFE IS EARNEST AND THE GRAVE IS NOT ITS GOAL"],
  ["Longfellow", "The Song of Hiawatha", "BY THE SHORES OF GITCHE GUMEE BY THE SHINING BIG SEA WATER"],
  ["Longfellow", "The Village Blacksmith", "UNDER A SPREADING CHESTNUT TREE THE VILLAGE SMITHY STANDS"],
  ["Burns", "A Red, Red Rose", "O MY LUVE IS LIKE A RED RED ROSE"],
  ["Burns", "To a Mouse", "THE BEST LAID SCHEMES OF MICE AND MEN GANG AFT AGLEY"],
  ["Burns", "Auld Lang Syne", "SHOULD AULD ACQUAINTANCE BE FORGOT AND NEVER BROUGHT TO MIND"],
  ["Burns", "To a Louse", "O WAD SOME POWER THE GIFTIE GIE US"],
  ["Coleridge", "The Rime of the Ancient Mariner", "IT IS AN ANCIENT MARINER AND HE STOPPETH ONE OF THREE"],
  ["Coleridge", "The Rime of the Ancient Mariner", "WATER WATER EVERY WHERE NOR ANY DROP TO DRINK"],
  ["Coleridge", "Kubla Khan", "A DAMSEL WITH A DULCIMER IN A VISION ONCE I SAW"],
  ["Browning", "My Last Duchess", "THATS MY LAST DUCHESS PAINTED ON THE WALL"],
  ["Browning", "Porphyria's Lover", "THE RAIN SET EARLY IN TONIGHT THE SULLEN WIND WAS SOON AWAKE"],
  ["Browning", "Rabbi Ben Ezra", "GROW OLD ALONG WITH ME THE BEST IS YET TO BE"],
  ["Browning", "Home-Thoughts, from Abroad", "OH TO BE IN ENGLAND NOW THAT APRILS THERE"],
  ["Browning", "How Do I Love Thee", "I LOVE THEE TO THE DEPTH AND BREADTH AND HEIGHT MY SOUL CAN REACH"],
  ["Rossetti", "Remember", "REMEMBER ME WHEN I AM GONE AWAY GONE FAR AWAY INTO THE SILENT LAND"],
  ["Rossetti", "Goblin Market", "MORNING AND EVENING MAIDS HEARD THE GOBLINS CRY"],
  ["Rossetti", "A Birthday", "MY HEART IS LIKE A SINGING BIRD WHOSE NEST IS IN A WATERED SHOOT"],
  ["Rossetti", "In the Bleak Midwinter", "IN THE BLEAK MIDWINTER FROSTY WIND MADE MOAN"],
  ["Poe", "The Raven", "ONCE UPON A MIDNIGHT DREARY WHILE I PONDERED WEAK AND WEARY"],
  ["Poe", "The Raven", "AND THE RAVEN NEVER FLITTING STILL IS SITTING ON THE PALLID BUST"],
  ["Poe", "Annabel Lee", "IT WAS MANY AND MANY A YEAR AGO IN A KINGDOM BY THE SEA"],
  ["Poe", "A Dream Within a Dream", "ALL THAT WE SEE OR SEEM IS BUT A DREAM WITHIN A DREAM"],
  ["Poe", "Alone", "FROM CHILDHOODS HOUR I HAVE NOT BEEN AS OTHERS WERE"],
  ["Donne", "No Man Is an Island", "NO MAN IS AN ISLAND ENTIRE OF ITSELF EVERY MAN IS A PIECE"],
  ["Donne", "A Valediction: Forbidding Mourning", "AS VIRTUOUS MEN PASS MILDLY AWAY AND WHISPER TO THEIR SOULS TO GO"],
  ["Donne", "The Sun Rising", "BUSY OLD FOOL UNRULY SUN WHY DOST THOU THUS"],
  ["Donne", "Death Be Not Proud", "DEATH BE NOT PROUD THOUGH SOME HAVE CALLED THEE"],
  ["Donne", "The Flea", "MARK BUT THIS FLEA AND MARK IN THIS HOW LITTLE THAT"],
  ["Milton", "Paradise Lost", "OF MANS FIRST DISOBEDIENCE AND THE FRUIT OF THAT FORBIDDEN TREE"],
  ["Milton", "Paradise Lost", "BETTER TO REIGN IN HELL THAN SERVE IN HEAVEN"],
  ["Milton", "Paradise Lost", "THE MIND IS ITS OWN PLACE AND IN ITSELF"],
  ["Milton", "On His Blindness", "WHEN I CONSIDER HOW MY LIGHT IS SPENT"],
  ["Milton", "On His Blindness", "THEY ALSO SERVE WHO ONLY STAND AND WAIT"],
  ["Pope", "An Essay on Criticism", "TO ERR IS HUMAN TO FORGIVE DIVINE"],
  ["Pope", "An Essay on Criticism", "A LITTLE LEARNING IS A DANGEROUS THING DRINK DEEP OR TASTE NOT"],
  ["Pope", "An Essay on Criticism", "FOOLS RUSH IN WHERE ANGELS FEAR TO TREAD"],
  ["Pope", "An Essay on Man", "THE PROPER STUDY OF MANKIND IS MAN"],
  ["Pope", "An Essay on Man", "HOPE SPRINGS ETERNAL IN THE HUMAN BREAST"],
  ["Pope", "The Rape of the Lock", "WHAT DIRE OFFENCE FROM AMOROUS CAUSES SPRINGS"],
  ["Marlowe", "The Passionate Shepherd to His Love", "COME LIVE WITH ME AND BE MY LOVE"],
  ["Marlowe", "The Passionate Shepherd to His Love", "AND WE WILL ALL THE PLEASURES PROVE THAT VALLEYS GROVES HILLS AND FIELDS"],
  ["Marlowe", "Doctor Faustus", "WAS THIS THE FACE THAT LAUNCHED A THOUSAND SHIPS"],
  ["Herrick", "Delight in Disorder", "A SWEET DISORDER IN THE DRESS KINDLES IN CLOTHES A WANTONNESS"],
  ["Herbert", "The Collar", "I STRUCK THE BOARD AND CRIED NO MORE I WILL ABROAD"],
  ["Herbert", "Easter Wings", "LORD WHO CREATEDST MAN IN WEALTH AND STORE"],
  ["Herbert", "Love (III)", "LOVE BADE ME WELCOME YET MY SOUL DREW BACK"],
  ["Jonson", "Song: To Celia", "DRINK TO ME ONLY WITH THINE EYES AND I WILL PLEDGE WITH MINE"],
  ["Jonson", "On My First Son", "FAREWELL THOU CHILD OF MY RIGHT HAND AND JOY"],
  ["Marvell", "To His Coy Mistress", "HAD WE BUT WORLD ENOUGH AND TIME THIS COYNESS LADY WERE NO CRIME"],
  ["Marvell", "To His Coy Mistress", "BUT AT MY BACK I ALWAYS HEAR TIMES WINGED CHARIOT HURRYING NEAR"],
  ["Marvell", "The Garden", "WHAT WONDROUS LIFE IS THIS I LEAD RIPE APPLES DROP ABOUT MY HEAD"],
  ["Spenser", "The Faerie Queene", "A GENTLE KNIGHT WAS PRICKING ON THE PLAIN"],
  ["Spenser", "Amoretti LXXV", "ONE DAY I WROTE HER NAME UPON THE STRAND"],
  ["Spenser", "Epithalamion", "YE LEARNED SISTERS WHICH HAVE OFTENTIMES BEEN TO ME AIDING"],
  ["Shakespeare", "Sonnet 129", "THE EXPENSE OF SPIRIT IN A WASTE OF SHAME IS LUST IN ACTION"],
  ["Shakespeare", "Sonnet 65", "SINCE BRASS NOR STONE NOR EARTH NOR BOUNDLESS SEA"],
  ["Shakespeare", "Sonnet 97", "HOW LIKE A WINTER HATH MY ABSENCE BEEN FROM THEE"],
  ["Keats", "Ode to Psyche", "O GODDESS HEAR THESE TUNELESS NUMBERS WRUNG BY SWEET ENFORCEMENT"],
  ["Keats", "Ode on Melancholy", "NO NO GO NOT TO LETHE NEITHER TWIST WOLFSBANE TIGHT ROOTED"],
  ["Keats", "Ode on Indolence", "ONE MORN BEFORE ME WERE THREE FIGURES SEEN"],
  ["Keats", "The Eve of St. Agnes", "ST AGNES EVE AH BITTER CHILL IT WAS THE OWL FOR ALL HIS FEATHERS"],
  ["Shelley", "Adonais", "I WEEP FOR ADONAIS HE IS DEAD O WEEP FOR ADONAIS"],
  ["Shelley", "Hymn to Intellectual Beauty", "THE AWFUL SHADOW OF SOME UNSEEN POWER FLOATS THOUGH UNSEEN AMONG US"],
  ["Byron", "Don Juan", "I WANT A HERO AN UNCOMMON WANT"],
  ["Byron", "Childe Harold's Pilgrimage", "THERE IS A PLEASURE IN THE PATHLESS WOODS"],
  ["Wordsworth", "Lines Written in Early Spring", "I HEARD A THOUSAND BLENDED NOTES WHILE IN A GROVE I SATE RECLINED"],
  ["Wordsworth", "London, 1802", "MILTON THOU SHOULDST BE LIVING AT THIS HOUR ENGLAND HATH NEED OF THEE"],
  ["Wordsworth", "She Dwelt among the Untrodden Ways", "SHE DWELT AMONG THE UNTRODDEN WAYS BESIDE THE SPRINGS OF DOVE"],
  ["Blake", "The Chimney Sweeper", "WHEN MY MOTHER DIED I WAS VERY YOUNG AND MY FATHER SOLD ME"],
  ["Dickinson", "Much Madness is divinest Sense", "MUCH MADNESS IS DIVINEST SENSE TO A DISCERNING EYE"],
  ["Dickinson", "I heard a Fly buzz - when I died", "I HEARD A FLY BUZZ WHEN I DIED THE STILLNESS IN THE ROOM"],
  ["Dickinson", "After great pain, a formal feeling comes", "AFTER GREAT PAIN A FORMAL FEELING COMES THE NERVES SIT CEREMONIOUS"],
  ["Whitman", "Crossing Brooklyn Ferry", "FLOOD TIDE BELOW ME I SEE YOU FACE TO FACE"],
  ["Frost", "Desert Places", "SNOW FALLING AND NIGHT FALLING FAST OH FAST"],
  ["Tennyson", "The Lotus-Eaters", "COURAGE HE SAID AND POINTED TOWARD THE LAND"],
  ["Longfellow", "The Wreck of the Hesperus", "IT WAS THE SCHOONER HESPERUS THAT SAILED THE WINTRY SEA"],
  ["Coleridge", "This Lime-Tree Bower My Prison", "WELL THEY ARE GONE AND HERE MUST I REMAIN"],
  ["Browning", "Andrea del Sarto", "AH BUT A MANS REACH SHOULD EXCEED HIS GRASP OR WHATS A HEAVEN FOR"],
  ["Browning", "Meeting at Night", "THE GRAY SEA AND THE LONG BLACK LAND"],
  ["Poe", "To Helen", "HELEN THY BEAUTY IS TO ME LIKE THOSE NICEAN BARKS OF YORE"],
  ["Poe", "Eldorado", "GAILY BEDIGHT A GALLANT KNIGHT IN SUNSHINE AND IN SHADOW"],
  ["Donne", "The Good-Morrow", "I WONDER BY MY TROTH WHAT THOU AND I DID TILL WE LOVED"],
  ["Milton", "Lycidas", "YET ONCE MORE O YE LAURELS AND ONCE MORE YE MYRTLES BROWN"],
  ["Tennyson", "Flower in the Crannied Wall", "FLOWER IN THE CRANNIED WALL I PLUCK YOU OUT OF THE CRANNIES"],
  ["Wordsworth", "It Is a Beauteous Evening, Calm and Free", "IT IS A BEAUTEOUS EVENING CALM AND FREE"]
];

function getPool(difficulty: Difficulty): PoemEntry[] {
  return difficulty === "haiku" ? HAIKU : ENGLISH;
}

export function getPuzzlePool(difficulty: Difficulty): PuzzleDef[] {
  const pool = getPool(difficulty);
  const prefix = difficulty === "haiku" ? "h" : "p";
  return pool.map((p, i) => {
    const id = `${prefix}${String(i + 1).padStart(3, "0")}`;
    const rand = seededRandom(`serpentine:layout:${id}`);
    return expand(p[0], p[1], p[2], id, difficulty, rand);
  });
}

export function getPuzzle(
  difficulty: Difficulty,
  index: number,
  layoutSalt = "",
): PuzzleDef {
  const pool = getPool(difficulty);
  const i = index % pool.length;
  const p = pool[i];
  const prefix = difficulty === "haiku" ? "h" : "p";
  const id = `${prefix}${String(i + 1).padStart(3, "0")}`;
  const seed = layoutSalt
    ? `serpentine:layout:${id}:${layoutSalt}`
    : `serpentine:layout:${id}`;
  const rand = seededRandom(seed);
  return expand(p[0], p[1], p[2], id, difficulty, rand);
}

export function getAuthorForDay(index: number, difficulty: Difficulty = "haiku"): string {
  const pool = getPool(difficulty);
  return pool[index % pool.length][0];
}

export function getPoolSize(difficulty: Difficulty = "haiku"): number {
  return getPool(difficulty).length;
}
