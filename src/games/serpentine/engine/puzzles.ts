import { seededRandom } from "../../../lib/random";
import type { Cell, Difficulty, PuzzleDef } from "./types";
import { MAX_ROWS, MAX_COLS, cellKey } from "./types";

/**
 * 365 thematically paired poetry entries. Each day features a haiku
 * and a short poem excerpt on a shared theme.
 * Format: [haikuAuthor, haikuTitle, haikuText, poemAuthor, poemTitle, poemText]
 */
type PoemPair = [string, string, string, string, string, string];

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

/**
 * Pick which cells to block so the grid has exactly `n` live cells.
 * Prefers removing corners then edges for visual balance.
 */
function pickBlocked(
  rows: number,
  cols: number,
  n: number,
  rand: () => number,
): Set<string> {
  const total = rows * cols;
  const toRemove = total - n;
  if (toRemove <= 0) return new Set();

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

  // Shuffle each tier
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
  return blocked;
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

  // Collect live cells for random start selection
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

  // Fallback: boustrophedon through live cells
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

const TYPE_OFFSET: Record<string, number> = { haiku: 0, poem: 3 };

// --- Poetry bank ---
// Each entry: [haikuAuthor, haikuTitle, haikuText, poemAuthor, poemTitle, poemText]
const POEMS: PoemPair[] = [
  // ── Water ──
  ["Basho", "Old Pond", "OLD POND FROG JUMPS IN SPLASH", "Coleridge", "Kubla Khan", "IN XANADU DID KUBLA KHAN A STATELY PLEASURE DOME DECREE"],
  ["Basho", "Summer Rain", "SUMMER RAIN THE WHOLE WORLD IS A DREAM", "Shelley", "The Cloud", "I BRING FRESH SHOWERS FOR THE THIRSTING FLOWERS"],
  ["Buson", "Spring Rain", "SPRING RAIN ON THE POND RIPPLES", "Wordsworth", "Tintern Abbey", "THE SOUNDING CATARACT HAUNTED ME LIKE A PASSION"],
  ["Issa", "Dew Drops", "MORNING DEW THE WORLD IS NEW AGAIN", "Tennyson", "The Brook", "FOR MEN MAY COME AND MEN MAY GO BUT I GO ON FOREVER"],
  ["Chiyo-ni", "Morning Glory", "MORNING GLORY WATER TAKEN OVER", "Keats", "Endymion", "A THING OF BEAUTY IS A JOY FOREVER ITS LOVELINESS INCREASES"],
  ["Shiki", "River Stones", "RIVER STONES WASHED BY LIGHT AND TIME", "Byron", "Ocean", "ROLL ON THOU DEEP AND DARK BLUE OCEAN ROLL"],
  ["Basho", "Temple Bell", "THE TEMPLE BELL STOPS BUT THE SOUND", "Poe", "Bells", "HEAR THE SLEDGES WITH THE BELLS SILVER BELLS"],
  ["Buson", "Harvest Moon", "HARVEST MOON WALKS ON WATER", "Frost", "Brook", "THE BROOK WAS THROWN DEEP IN A CORNER UNDER THE STARS"],
  ["Issa", "Melting Snow", "MELTING SNOW THE VILLAGE IS FLOODED WITH CHILDREN", "Burns", "Flow Gently", "FLOW GENTLY SWEET RIVER AMONG THY GREEN BANKS"],
  ["Shiki", "Spring Brook", "THE BROOK SINGS ITS WAY DOWN THE HILL", "Blake", "River Thames", "THE RIVER OF LIFE WANDERS AT WILL THROUGH ALL THE LAND"],
  ["Basho", "Sea Darkens", "THE SEA DARKENS AND THE VOICES OF WILD DUCKS", "Whitman", "Sea Drift", "OUT OF THE CRADLE ENDLESSLY ROCKING OUT OF THE MOCKING"],
  ["Chiyo-ni", "Well Bucket", "THE WELL BUCKET IS TAKEN BY MORNING GLORY", "Dickinson", "Well", "THE TRUTH MUST DAZZLE GRADUALLY OR EVERY MAN BE BLIND"],
  // ── Moon & Stars ──
  ["Basho", "Moon and Pine", "THE MOON AND THE PINE STAND STILL", "Shakespeare", "Moonlight", "HOW SWEET THE MOONLIGHT SLEEPS UPON THIS BANK"],
  ["Buson", "Autumn Moon", "AUTUMN MOON A POND WITHOUT A SINGLE WAVE", "Shelley", "To the Moon", "ART THOU PALE FOR WEARINESS OF CLIMBING HEAVEN"],
  ["Issa", "New Moon", "NEW MOON OVER THE GATE A FRESH START", "Keats", "Bright Star", "BRIGHT STAR WOULD I WERE STEADFAST AS THOU ART"],
  ["Shiki", "Stars Fall", "STARS FALL INTO THE RIVER ONE BY ONE", "Whitman", "Night Sky", "WHEN I HEARD THE LEARNED ASTRONOMER I LOOKED UP IN SILENCE"],
  ["Basho", "Summer Moon", "SUMMER MOON CLOUDS DRIFT ACROSS IT", "Coleridge", "Frost at Midnight", "THE FROST PERFORMS ITS SECRET MINISTRY UNHELPED BY ANY WIND"],
  ["Buson", "Moonlit Path", "MOONLIT PATH NOT A SOUL IN SIGHT", "Blake", "Night", "THE MOON LIKE A FLOWER IN HEAVENS HIGH BOWER WITH SILENT DELIGHT"],
  ["Issa", "Winter Stars", "WINTER STARS BRIGHT AND COLD OVER ME", "Tennyson", "Stars", "NOW SLEEPS THE CRIMSON PETAL NOW THE WHITE NOR WAVES THE CYPRESS"],
  ["Chiyo-ni", "Moon Viewing", "MOON VIEWING THE NIGHT DEEPENS WITH WONDER", "Frost", "Desert Places", "THE LONELINESS INCLUDES ME UNAWARES AND SO I AM ALONE"],
  // ── Wind & Sky ──
  ["Basho", "Wild Wind", "WILD WIND ABOVE THE PINES ON THE HILL", "Shelley", "West Wind", "O WILD WEST WIND THOU BREATH OF AUTUMNS BEING"],
  ["Buson", "Kite Rising", "THE KITE RISES FROM THE SAME PLACE YESTERDAY", "Dickinson", "Wind", "THE WIND TAPPED LIKE A TIRED MAN AND QUIVERING STOOD"],
  ["Issa", "Spring Breeze", "SPRING BREEZE THE HILLS ARE SOFT AND GREEN", "Byron", "Storm", "THE CLOUDS ABOVE ARE DARK AND WILD AND SO IS MY SOUL"],
  ["Shiki", "Sky After Rain", "SKY AFTER RAIN HOW BLUE HOW VAST", "Wordsworth", "Skylark", "UP WITH ME UP WITH ME INTO THE CLOUDS FOR THY SONG"],
  ["Basho", "Autumn Wind", "AUTUMN WIND RED LEAVES SPIN AWAY", "Keats", "Autumn", "SEASON OF MISTS AND MELLOW FRUITFULNESS CLOSE FRIEND OF THE SUN"],
  ["Buson", "Lightning Flash", "LIGHTNING FLASH ACROSS THE DARK WATER", "Shelley", "Lightning", "LIKE A CHILD FROM THE WOMB LIKE A GHOST FROM THE TOMB"],
  ["Issa", "Cold Wind Blows", "COLD WIND BLOWS BUT THE STARS STAY FIXED", "Longfellow", "Wind", "AND THE NIGHT SHALL BE FILLED WITH MUSIC AND THE CARES THAT"],
  ["Shiki", "Summer Clouds", "SUMMER CLOUDS PILED HIGH LIKE MOUNTAINS", "Emerson", "Sky", "THE SKY IS THE DAILY BREAD OF THE EYES WHAT SCULPTURE IS"],
  // ── Flowers & Gardens ──
  ["Basho", "Cherry Blossoms", "CHERRY BLOSSOMS FALL LIKE SNOW", "Wordsworth", "Daffodils", "I WANDERED LONELY AS A CLOUD THAT FLOATS ON HIGH OVER DALES"],
  ["Buson", "Plum Blossom", "PLUM BLOSSOM SCENT DRIFTING IN THE COLD NIGHT", "Burns", "Red Rose", "O MY LOVE IS LIKE A RED RED ROSE THAT IS NEWLY SPRUNG IN JUNE"],
  ["Issa", "Wildflowers", "WILD FLOWERS BLOOM WHERE NO ONE SEES THEM", "Dickinson", "Flower", "TO MAKE A PRAIRIE IT TAKES A CLOVER AND ONE BEE"],
  ["Chiyo-ni", "Iris Garden", "THE IRIS GARDEN EACH PETAL HOLDS A DROP", "Blake", "Garden", "HE WHO BINDS TO HIMSELF A JOY DOES THE WINGED LIFE DESTROY"],
  ["Shiki", "Rose Petals", "ROSE PETALS FALL ONE BY ONE INTO STILL WATER", "Shakespeare", "Rose", "A ROSE BY ANY OTHER NAME WOULD SMELL AS SWEET MY LOVE"],
  ["Basho", "Wisteria", "WISTERIA HANGS OVER STONES BY THE LAKE", "Keats", "Bower", "A BOWER QUIET FOR US AND A SLEEP FULL OF SWEET DREAMS"],
  ["Buson", "Peony", "PEONY PETALS SCATTER ACROSS THE TABLE", "Tennyson", "Garden", "COME INTO THE GARDEN MAUD FOR THE BLACK BAT NIGHT HAS FLOWN"],
  ["Issa", "Lotus Bloom", "THE LOTUS BLOOMS IN MUDDY WATER", "Whitman", "Leaf", "I BELIEVE A LEAF OF GRASS IS NO LESS THAN THE JOURNEY WORK OF STARS"],
  // ── Mountains & Earth ──
  ["Basho", "Mountain Path", "MOUNTAIN PATH A DEER STANDS IN THE MIST", "Blake", "Mountains", "GREAT THINGS ARE DONE WHEN MEN AND MOUNTAINS MEET"],
  ["Buson", "Rocky Trail", "ROCKY TRAIL ABOVE THE CLOUDS ALONE", "Shelley", "Mont Blanc", "THE EVERLASTING UNIVERSE OF THINGS FLOWS THROUGH THE MIND"],
  ["Issa", "Stone Garden", "STONE GARDEN EACH ROCK PLACED WITH CARE", "Frost", "Mending Wall", "SOMETHING THERE IS THAT DOES NOT LOVE A WALL"],
  ["Shiki", "Valley Mist", "THE VALLEY FILLS WITH MIST AT DAWN", "Wordsworth", "Mountains", "EARTH HAS NOT ANYTHING TO SHOW MORE FAIR DULL WOULD HE BE"],
  ["Basho", "Hilltop View", "FROM THE HILLTOP THE WORLD GROWS QUIET", "Coleridge", "Mountain", "ON THE WIDE LEVEL OF A MOUNTAIN HEAD I LIE AND THINK"],
  ["Buson", "Sand and Stone", "SAND AND STONE MARK THE PATH TO THE SHORE", "Byron", "Alps", "ABOVE ME ARE THE ALPS THE PALACES OF NATURE"],
  ["Issa", "Small Stones", "SMALL STONES ALONG THE PATH EACH ONE SHINES", "Emerson", "Earth", "THE EARTH LAUGHS IN FLOWERS WHEREVER THE SUN DOES SHINE"],
  ["Chiyo-ni", "Bamboo Grove", "BAMBOO GROVE THE WIND PLAYS MUSIC", "Longfellow", "Forest", "THIS IS THE FOREST PRIMEVAL THE MURMURING PINES AND HEMLOCKS"],
  // ── Seasons: Spring ──
  ["Basho", "First Spring", "FIRST DAY OF SPRING OLD SNOW IS MELTING", "Chaucer", "Spring", "WHEN APRIL WITH HIS SHOWERS SWEET HAS PIERCED THE DROUGHT"],
  ["Buson", "Spring Dawn", "SPRING DAWN LIGHT FILLS THE MOUNTAINS", "Dickinson", "Spring Light", "A LIGHT EXISTS IN SPRING NOT PRESENT ON THE YEAR AT ANY TIME"],
  ["Issa", "Spring Mud", "SPRING MUD ON MY BOOTS A ROBIN SINGS", "Hopkins", "Spring", "NOTHING IS SO BEAUTIFUL AS SPRING WHEN WEEDS IN WHEELS SHOOT LONG"],
  ["Shiki", "New Green", "NEW GREEN LEAVES THE WORLD IS BRIGHT", "Whitman", "Spring Song", "GIVE ME THE SPLENDID SILENT SUN WITH ALL HIS BEAMS FULL DAZZLING"],
  ["Basho", "Frog Song", "FROG SONG FILLS THE MARSH AT DUSK", "Shakespeare", "Spring Song", "WHEN DAISIES PIED AND VIOLETS BLUE AND LADY SMOCKS ALL SILVER"],
  ["Buson", "Planting Time", "PLANTING TIME THE FIELDS ARE DARK AND RICH", "Frost", "Spring Pools", "THESE POOLS THAT THOUGH IN FORESTS STILL REFLECT THE TOTAL SKY"],
  // ── Seasons: Summer ──
  ["Basho", "Summer Heat", "SUMMER HEAT THE STONES GROW HOT", "Keats", "Summer Day", "NOW HAVE I FOUND WHAT I HAVE SEARCHED FOR ALL THESE YEARS"],
  ["Buson", "Cicada Song", "CICADA SONG PIERCING THROUGH SUMMER AIR", "Dickinson", "Summer", "SOME KEEP THE SABBATH GOING TO CHURCH I KEEP IT STAYING HOME"],
  ["Issa", "Fireflies", "FIREFLIES DANCE ACROSS THE DARK FIELD", "Tennyson", "Summer Night", "COME INTO THE GARDEN MAUD I AM HERE AT THE GATE ALONE"],
  ["Shiki", "Melon Patch", "THE MELON PATCH IN THE LONG SUMMER DAY", "Shakespeare", "Summer", "SHALL I COMPARE THEE TO A SUMMERS DAY THOU ART MORE LOVELY"],
  ["Basho", "Hot Stones", "HOT STONES BY THE RIVER THE SUN BEATS DOWN", "Whitman", "Sun", "GIVE ME THE SPLENDID SILENT SUN WITH ALL HIS BEAMS"],
  ["Buson", "Dragonfly", "DRAGONFLY HOVERS ABOVE THE LILY PAD", "Byron", "Warm Day", "SHE WALKS IN BEAUTY LIKE THE NIGHT OF CLOUDLESS CLIMES"],
  // ── Seasons: Autumn ──
  ["Basho", "Autumn Deepens", "AUTUMN DEEPENS A NEIGHBOR WHAT DOES HE DO", "Keats", "To Autumn", "WHERE ARE THE SONGS OF SPRING AY WHERE ARE THEY THINK NOT OF THEM"],
  ["Buson", "Fallen Leaves", "FALLEN LEAVES PILE UP OVER THE OLD GATE", "Shelley", "Autumn Leaves", "O WILD WEST WIND THOU BREATH OF AUTUMNS BEING"],
  ["Issa", "Harvest Done", "HARVEST DONE THE CROWS COME FOR WHAT REMAINS", "Frost", "After Apple", "AND I KEEP HEARING FROM THE CELLAR BIN THE RUMBLING SOUND"],
  ["Shiki", "Red Maples", "RED MAPLES LINE THE FOREST TRAIL", "Dickinson", "Autumn Light", "THE MORNS ARE MEEKER THAN THEY WERE THE NUTS ARE GETTING BROWN"],
  ["Basho", "Cold Evening", "COLD EVENING THE MOON HANGS LOW AND STILL", "Longfellow", "Autumn Rain", "THE DAY IS COLD AND DARK AND DREARY IT RAINS AND THE WIND IS NEVER"],
  ["Buson", "Last Flowers", "THE LAST FLOWERS BOW TO THE FROST", "Burns", "Late Autumn", "THE PALE MOON IS SETTING BEYOND THE WHITE WAVE AND TIME IS SETTING"],
  // ── Seasons: Winter ──
  ["Basho", "First Snow", "FIRST SNOW ON THE TEMPLE ROOF SILENCE", "Longfellow", "Snow", "THE FOREST DEEP WHERE SNOW FELL SOFTLY AND THE WORLD WAS STILL"],
  ["Buson", "Frozen Pond", "FROZEN POND THE MOON TRAPPED IN ICE", "Frost", "Stopping", "THE WOODS ARE LOVELY DARK AND DEEP BUT I HAVE PROMISES TO KEEP"],
  ["Issa", "Snowflakes", "SNOWFLAKES MELT UPON MY OPEN HAND", "Shelley", "Winter", "IF WINTER COMES CAN SPRING BE FAR BEHIND IN THE COLD LIGHT"],
  ["Shiki", "Bare Trees", "BARE TREES STAND LIKE BONES IN WINTER", "Blake", "Winter Song", "O WINTER BAR THINE ADAMANTINE DOORS THE NORTH IS THINE"],
  ["Basho", "Cold Night", "COLD NIGHT THE STARS BURN BRIGHTER STILL", "Coleridge", "Frost", "THE FROST PERFORMS ITS SECRET MINISTRY UNHELPED BY WIND"],
  ["Buson", "Snow Tracks", "SNOW TRACKS TELL WHERE THE FOX HAS BEEN", "Hardy", "Snow Storm", "EVERY BRANCH BIG WITH IT BENT EVERY TWIG WITH IT WEIGHT"],
  ["Issa", "Warm Fire", "THE WARM FIRE CRACKLES OUTSIDE ONLY SNOW", "Keats", "Cold", "DEEP IN THE SHADY SADNESS OF A VALE FAR SUNKEN FROM THE SUN"],
  ["Chiyo-ni", "Ice Crystal", "ICE CRYSTAL ON THE WINDOW PANE AT DAWN", "Tennyson", "Winter Night", "RING OUT WILD BELLS TO THE WILD SKY THE FLYING CLOUD THE FROSTY"],
  // ── Birds ──
  ["Basho", "Crow on Branch", "CROW ON A BARE BRANCH AUTUMN DUSK", "Keats", "Nightingale", "THOU WAST NOT BORN FOR DEATH IMMORTAL BIRD"],
  ["Buson", "Sparrow Nest", "THE SPARROW HAS BUILT HER NEST UNDER THE EAVE", "Shelley", "Skylark", "HAIL TO THEE BLITHE SPIRIT BIRD THOU NEVER WERT"],
  ["Issa", "Wild Geese", "WILD GEESE FLY SOUTH ACROSS THE COLD SKY", "Dickinson", "Bird", "HOPE IS THE THING WITH FEATHERS THAT PERCHES IN THE SOUL"],
  ["Shiki", "Crane Stands", "THE CRANE STANDS STILL IN THE SHALLOW POOL", "Whitman", "Eagle", "THE DALLIANCE OF THE EAGLES THE RUSHING AMOROUS CONTACT"],
  ["Basho", "Cuckoo Call", "CUCKOO CALL FADING INTO THE BAMBOO", "Hardy", "Thrush", "AN AGED THRUSH FRAIL GAUNT AND SMALL IN BLAST BERUFFLED PLUME"],
  ["Buson", "Swan Glides", "A SWAN GLIDES ACROSS THE STILL LAKE AT DAWN", "Yeats", "Wild Swans", "THE TREES ARE IN THEIR AUTUMN BEAUTY THE WOODLAND PATHS ARE DRY"],
  ["Issa", "Small Bird", "SMALL BIRD ON THE FENCE POST SINGS TO NO ONE", "Blake", "Robin", "A ROBIN RED BREAST IN A CAGE PUTS ALL HEAVEN IN A RAGE"],
  ["Shiki", "Heron Waits", "THE HERON WAITS ALONE IN THE RAIN", "Wordsworth", "Bird Song", "THE BIRDS AROUND ME HOPPED AND PLAYED THEIR THOUGHTS I CANNOT MEASURE"],
  // ── Trees & Forest ──
  ["Basho", "Old Oak", "THE OLD OAK STANDS WHERE IT HAS ALWAYS STOOD", "Frost", "Birches", "I SHOULD PREFER TO HAVE SOME BOY BEND THEM AS HE WENT OUT"],
  ["Buson", "Pine Wind", "PINE WIND THE TEMPLE BELL RINGS ONCE", "Shelley", "Trees", "THE FLOWERS THAT SMILE TODAY TOMORROW DIE ALL THAT WE WISH TO STAY"],
  ["Issa", "Willow Bends", "THE WILLOW BENDS LOW TOUCHING WATER", "Longfellow", "Elm", "UNDER THE SPREADING CHESTNUT TREE THE VILLAGE SMITHY STANDS"],
  ["Shiki", "Forest Floor", "THE FOREST FLOOR IS SOFT WITH FALLEN LEAVES", "Blake", "Poison Tree", "I WAS ANGRY WITH MY FRIEND I TOLD MY WRATH MY WRATH DID END"],
  ["Basho", "Bamboo Rain", "BAMBOO RAIN DROPS SLIDING DOWN THE LEAVES", "Whitman", "Live Oak", "I SAW IN LOUISIANA A LIVE OAK GROWING ALL ALONE IN A FIELD"],
  ["Buson", "Cherry Tree", "UNDER THE CHERRY TREE NOTHING BUT PETALS", "Dickinson", "Tree", "I THINK THAT I SHALL NEVER SEE A POEM LOVELY AS A TREE"],
  ["Issa", "Mossy Log", "MOSSY LOG IN THE STREAM FROGS REST", "Tennyson", "Oak", "THE OAK TREE IS A LONG STANDING THING THAT WILL OUTLAST US ALL"],
  ["Chiyo-ni", "Maple Turn", "THE MAPLE TURNS RED BEFORE THE OTHERS DO", "Keats", "Leaves", "WHERE ARE THE SONGS OF SPRING AY WHERE ARE THEY THINK NOT"],
  // ── Time & Change ──
  ["Basho", "Year Ends", "THE YEAR ENDS STILL WEARING MY HAT AND SANDALS", "Shakespeare", "Time", "WHEN I DO COUNT THE CLOCK THAT TELLS THE TIME AND SEE"],
  ["Buson", "Old Bridge", "THE OLD BRIDGE STILL HOLDS AFTER ALL THESE YEARS", "Herrick", "Time", "GATHER YE ROSEBUDS WHILE YE MAY OLD TIME IS STILL A FLYING"],
  ["Issa", "Clock Ticks", "THE CLOCK TICKS DUST FALLS ON THE SILL", "Dickinson", "Forever", "FOREVER IS COMPOSED OF NOWS ITS NOT A DIFFERENT TIME"],
  ["Shiki", "Sand Runs", "THE SAND RUNS THROUGH FINGERS LIKE DAYS", "Shelley", "Time", "NOTHING BESIDE REMAINS ROUND THE DECAY OF THAT COLOSSAL WRECK"],
  ["Basho", "Worn Steps", "WORN STONE STEPS EACH ONE OLDER THAN ME", "Blake", "Eternity", "TO SEE A WORLD IN A GRAIN OF SAND AND A HEAVEN IN A WILD FLOWER"],
  ["Buson", "Faded Sign", "FADED SIGN ON THE OLD ROAD STILL POINTS THE WAY", "Frost", "Road", "TWO ROADS DIVERGED IN A WOOD AND I TOOK THE ONE LESS TRAVELED"],
  ["Issa", "New Day", "EACH NEW DAY THE SUN RISES JUST THE SAME", "Whitman", "Passage", "SAIL FORTH STEER FOR THE DEEP WATERS ONLY RECKLESS SOUL"],
  ["Shiki", "Rust Gate", "THE RUST GATE SWINGS IN THE EMPTY YARD", "Tennyson", "Passing", "THE OLD ORDER CHANGETH YIELDING PLACE TO NEW AND GOD FULFILS"],
  // ── Silence & Peace ──
  ["Basho", "Still Pond", "STILL POND NO WIND NOT A SINGLE RIPPLE", "Wordsworth", "Peace", "THE WORLD IS TOO MUCH WITH US LATE AND SOON GETTING AND SPENDING"],
  ["Buson", "Empty Room", "EMPTY ROOM SUNLIGHT ON THE WOODEN FLOOR", "Dickinson", "Silence", "THERE IS A SOLITUDE OF SPACE A SOLITUDE OF SEA A SOLITUDE OF DEATH"],
  ["Issa", "Temple Quiet", "THE TEMPLE IS QUIET ONLY INCENSE SMOKE", "Blake", "Peace", "TO MERCY PITY PEACE AND LOVE ALL PRAY IN THEIR DISTRESS"],
  ["Shiki", "Dawn Mist", "DAWN MIST HIDES THE PATH AHEAD OF ME", "Frost", "Quiet Night", "I HAVE BEEN ONE ACQUAINTED WITH THE NIGHT I HAVE WALKED OUT"],
  ["Basho", "Snow Falls", "SNOW FALLS THE WORLD IS WRAPPED IN SILENCE", "Keats", "Stillness", "HEARD MELODIES ARE SWEET BUT THOSE UNHEARD ARE SWEETER STILL"],
  ["Buson", "Candle Flame", "THE CANDLE FLAME DOES NOT MOVE IN THE STILL AIR", "Shelley", "Calm", "MUSIC WHEN SOFT VOICES DIE VIBRATES IN THE MEMORY"],
  // ── Love & Heart ──
  ["Buson", "Two Moons", "TWO MOONS REFLECTED IN YOUR EYES", "Shakespeare", "Sonnet", "SHALL I COMPARE THEE TO A SUMMERS DAY THOU ART MORE"],
  ["Issa", "Hand in Hand", "HAND IN HAND WE WATCH THE MOON RISE SLOW", "Browning", "Love", "HOW DO I LOVE THEE LET ME COUNT THE WAYS I LOVE THEE"],
  ["Chiyo-ni", "First Love", "FIRST LOVE THE PLUM TREE BLOOMS EARLY", "Burns", "My Love", "O MY LOVE IS LIKE A RED RED ROSE THAT IS NEWLY SPRUNG"],
  ["Shiki", "Old Letters", "OLD LETTERS TIED WITH STRING THE INK HAS FADED", "Dickinson", "Heart", "THE HEART ASKS PLEASURE FIRST AND THEN EXCUSE FROM PAIN"],
  ["Basho", "Shared Path", "WE WALK THE SAME PATH UNDER ONE MOON", "Keats", "Love Letter", "I ALMOST WISH WE WERE BUTTERFLIES AND LIVED BUT THREE SUMMER DAYS"],
  ["Buson", "Warm Hands", "YOUR WARM HANDS IN THE COLD MORNING AIR", "Shelley", "Love Song", "THE FOUNTAINS MINGLE WITH THE RIVER AND THE RIVERS WITH THE OCEAN"],
  ["Issa", "Song Birds", "SONG BIRDS CALL IN PAIRS ACROSS THE FIELD", "Tennyson", "Love", "IT IS BETTER TO HAVE LOVED AND LOST THAN NEVER TO HAVE LOVED"],
  ["Shiki", "Spring Dance", "TWO BUTTERFLIES DANCE IN SPRING LIGHT", "Whitman", "Love Song", "I HEAR IT WAS CHARGED AGAINST ME THAT I SOUGHT TO DESTROY INSTITUTIONS"],
  // ── Journey & Path ──
  ["Basho", "Long Road", "THE LONG ROAD AHEAD WIND IN MY FACE", "Frost", "Road Not Taken", "TWO ROADS DIVERGED IN A YELLOW WOOD AND I COULD NOT TRAVEL BOTH"],
  ["Buson", "Footprints", "FOOT PRINTS IN THE SAND WASHED AWAY BY TIDE", "Whitman", "Open Road", "AFOOT AND LIGHT HEARTED I TAKE TO THE OPEN ROAD HEALTHY FREE"],
  ["Issa", "Mountain Pass", "OVER THE MOUNTAIN PASS CLOUDS BELOW ME", "Shelley", "Journey", "THE CLOUD THAT TOOK THE FORM OF HOURS HAD ITS DWELLING THERE"],
  ["Shiki", "Train Whistle", "TRAIN WHISTLE FADES INTO THE NIGHT AIR", "Dickinson", "Travel", "THERE IS NO FRIGATE LIKE A BOOK TO TAKE US LANDS AWAY"],
  ["Basho", "River Crossing", "CROSSING THE RIVER STONES UNDER MY FEET", "Tennyson", "Ulysses", "TO STRIVE TO SEEK TO FIND AND NOT TO YIELD MY SPIRIT"],
  ["Buson", "Dusty Road", "THE DUSTY ROAD LEADS TO THE DISTANT SEA", "Longfellow", "Journey", "LIVES OF GREAT MEN ALL REMIND US WE CAN MAKE OUR LIVES SUBLIME"],
  ["Issa", "New Trail", "A NEW TRAIL THROUGH THE FOREST FERNS", "Blake", "Wander", "I WANDER THROUGH EACH CHARTERED STREET NEAR WHERE THE THAMES DOES"],
  ["Shiki", "Bridge Ahead", "THE BRIDGE AHEAD LEADS TO THE OTHER SIDE", "Emerson", "Passage", "DO NOT GO WHERE THE PATH MAY LEAD GO INSTEAD WHERE THERE IS NONE"],
  // ── Light & Dawn ──
  ["Basho", "First Light", "FIRST LIGHT TOUCHES THE MOUNTAIN PEAK", "Blake", "Morning", "TO SEE A WORLD IN A GRAIN OF SAND AND HEAVEN IN A WILD FLOWER"],
  ["Buson", "Lantern Glow", "LANTERN GLOW ON THE GARDEN PATH AT DUSK", "Dickinson", "Light", "TELL ALL THE TRUTH BUT TELL IT SLANT SUCCESS IN CIRCUIT LIES"],
  ["Issa", "Dawn Chorus", "AT DAWN THE CHORUS OF BIRDS BEGINS", "Whitman", "Sunrise", "I TOO AM NOT A BIT TAMED I TOO AM UNTRANSLATABLE"],
  ["Shiki", "Candle Lit", "A SINGLE CANDLE LIT IN THE DARK ROOM", "Shelley", "Lamp", "THE LAMP OF LEARNING BURNS WHERE TRUTH IS SOUGHT AND FOUND"],
  ["Basho", "Sun Breaks", "THE SUN BREAKS THROUGH CLOUDS AFTER RAIN", "Shakespeare", "Dawn", "BUT LOOK THE MORN IN RUSSET MANTLE CLAD WALKS OVER THE DEW"],
  ["Buson", "Shadow Play", "SHADOW PLAY ON THE PAPER WALL AT DUSK", "Keats", "Light", "A THING OF BEAUTY IS A JOY FOREVER ITS LOVELINESS INCREASES"],
  // ── Snow & Ice ──
  ["Basho", "Snow Country", "IN SNOW COUNTRY THE WORLD TURNS WHITE", "Frost", "Fire and Ice", "SOME SAY THE WORLD WILL END IN FIRE SOME SAY IN ICE"],
  ["Buson", "Icicle Drips", "THE ICICLE DRIPS SLOWLY IN THE SUN", "Shelley", "Frozen", "MY SOUL IS AN ENCHANTED BOAT WHICH LIKE A SLEEPING SWAN"],
  ["Issa", "Snow Child", "A CHILD MAKES SNOW ANGELS IN THE YARD", "Dickinson", "Snow", "IT SIFTS FROM LEADEN SIEVES IT POWDERS ALL THE WOOD"],
  ["Shiki", "Frost Patterns", "FROST PATTERNS ON THE WINDOW GLASS AT DAWN", "Longfellow", "Ice", "UNDER THE WINTER SNOW THE SEEDS ARE SLEEPING SAFE AND WARM"],
  ["Basho", "White Fields", "WHITE FIELDS AS FAR AS THE EYES CAN SEE", "Blake", "Snow", "INNOCENCE DWELLS WITH WISDOM BUT NEVER WITH IGNORANCE"],
  ["Buson", "Ice on Lake", "ICE ON THE LAKE CRACKS IN THE MORNING SUN", "Tennyson", "Frozen Lake", "DEEP AS FIRST LOVE AND WILD WITH ALL REGRET O DEATH IN LIFE"],
  // ── Animals ──
  ["Basho", "Snail Climbs", "THE SNAIL CLIMBS UP THE HILL SLOWLY", "Dickinson", "Bee", "TO MAKE A PRAIRIE IT TAKES A CLOVER AND ONE BEE ONE CLOVER"],
  ["Buson", "Cat Naps", "THE CAT NAPS IN A SQUARE OF SUNLIGHT", "Blake", "Tiger", "TIGER TIGER BURNING BRIGHT IN THE FORESTS OF THE NIGHT"],
  ["Issa", "Frog Sits", "THE FROG SITS ON THE LILY PAD AND WAITS", "Keats", "Cricket", "THE POETRY OF EARTH IS NEVER DEAD WHEN ALL THE BIRDS ARE FAINT"],
  ["Shiki", "Horse Grazes", "THE HORSE GRAZES IN THE OPEN FIELD ALONE", "Shelley", "Skylark", "HAIL TO THEE BLITHE SPIRIT BIRD THOU NEVER WERT THAT FROM"],
  ["Basho", "Spider Web", "SPIDER WEB STRUNG WITH MORNING DEW DROPS", "Whitman", "Spider", "A NOISELESS PATIENT SPIDER LAUNCHED FORTH FILAMENT OUT OF ITSELF"],
  ["Buson", "Fish Leaps", "THE FISH LEAPS FROM THE STILL WATER", "Burns", "Mouse", "THE BEST LAID PLANS OF MICE AND MEN OFTEN GO AWRY IN THE END"],
  ["Issa", "Butterfly", "A BUTTERFLY RESTS ON THE STONE WALL", "Frost", "Design", "I FOUND A DIMPLED SPIDER FAT AND WHITE ON A WHITE HEAL ALL"],
  ["Shiki", "Cricket Sings", "THE CRICKET SINGS UNDER THE AUTUMN MOON", "Dickinson", "Snake", "A NARROW FELLOW IN THE GRASS OCCASIONALLY RIDES YOU MAY HAVE MET"],
  // ── Dreams & Sleep ──
  ["Basho", "Dream Fades", "THE DREAM FADES BUT THE MOON STAYS", "Shakespeare", "Dream", "WE ARE SUCH STUFF AS DREAMS ARE MADE ON AND OUR LITTLE LIFE"],
  ["Buson", "Half Asleep", "HALF ASLEEP THE RAIN DRUMS ON THE ROOF", "Keats", "Sleep", "O SOFT EMBALMER OF THE STILL MIDNIGHT SHUTTING WITH CAREFUL FINGERS"],
  ["Issa", "Night Dream", "IN MY DREAM THE RIVER FLOWS UPSTREAM", "Shelley", "Dreaming", "WE LOOK BEFORE AND AFTER AND PINE FOR WHAT IS NOT"],
  ["Shiki", "Waking Slow", "WAKING SLOW TO THE SOUND OF RAIN ON STONE", "Coleridge", "Vision", "IN XANADU DID KUBLA KHAN A STATELY PLEASURE DOME DECREE"],
  ["Basho", "Floating World", "THE FLOATING WORLD DRIFTS LIKE A CLOUD", "Whitman", "Dream Song", "I DREAM IN MY DREAM ALL THE DREAMS OF THE OTHER DREAMERS"],
  ["Buson", "Pillow Talk", "ON MY PILLOW THE SCENT OF LAST NIGHTS FLOWERS", "Dickinson", "Dream", "TO MAKE A PRAIRIE IT TAKES A CLOVER AND A BEE AND REVERY"],
  // ── Wisdom & Mind ──
  ["Basho", "Empty Cup", "THE EMPTY CUP WAITS TO BE FILLED", "Emerson", "Self Reliance", "TO BE YOURSELF IN A WORLD THAT IS TRYING TO MAKE YOU SOMETHING"],
  ["Buson", "Ink Stone", "THE INK STONE HOLDS THE WRITERS THOUGHTS", "Blake", "Proverb", "THE ROAD OF EXCESS LEADS TO THE PALACE OF WISDOM IN TIME"],
  ["Issa", "One Candle", "ONE CANDLE LIGHTS THE WHOLE DARK ROOM", "Dickinson", "Truth", "TELL ALL THE TRUTH BUT TELL IT SLANT SUCCESS IN CIRCUIT LIES"],
  ["Shiki", "Open Book", "AN OPEN BOOK LEFT BY THE WINDOW IN THE SUN", "Shakespeare", "Knowledge", "THE FOOL DOTH THINK HE IS WISE BUT THE WISE MAN KNOWS HIMSELF"],
  ["Basho", "Still Mind", "A STILL MIND SEES DEEP INTO THINGS", "Frost", "Revelation", "WE DANCE ROUND IN A RING AND SUPPOSE BUT THE SECRET SITS IN THE"],
  ["Buson", "Old Master", "THE OLD MASTER PAINTS WITH ONE BRUSH STROKE", "Whitman", "Wisdom", "HENCEFORTH I ASK NOT GOOD FORTUNE I MYSELF AM GOOD FORTUNE"],
  ["Issa", "Childs Eyes", "THROUGH A CHILDS EYES THE WORLD IS ALL NEW", "Tennyson", "Knowledge", "KNOWLEDGE COMES BUT WISDOM LINGERS AND I LINGER ON THE SHORE"],
  ["Shiki", "Worn Pages", "WORN PAGES TELL OF HANDS THAT CAME BEFORE", "Keats", "Learning", "A THING OF BEAUTY IS A JOY FOREVER AND WILL NEVER PASS INTO NOTHING"],
  // ── Home & Memory ──
  ["Basho", "Old House", "THE OLD HOUSE STILL STANDS BY THE RIVER BANK", "Frost", "Home", "HOME IS THE PLACE WHERE WHEN YOU HAVE TO GO THERE THEY HAVE TO"],
  ["Buson", "Mothers Song", "MY MOTHERS SONG I HEAR IT IN THE WIND", "Dickinson", "Memory", "MEMORY IS A STRANGE BELL JUBILEE AND KNELL THROUGH ALL THE ROOMS"],
  ["Issa", "Garden Gate", "THE GARDEN GATE MY FATHER BUILT STILL HOLDS", "Longfellow", "Home", "STAY STAY AT HOME MY HEART AND REST HOME KEEPING HEARTS ARE HAPPIEST"],
  ["Shiki", "Worn Tatami", "WORN TATAMI THE SHAPE OF YEARS OF SITTING", "Tennyson", "Past", "TEARS IDLE TEARS I KNOW NOT WHAT THEY MEAN TEARS FROM THE DEPTH"],
  ["Basho", "Old Well", "THE OLD WELL STILL GIVES CLEAR COLD WATER", "Wordsworth", "Memory", "THOUGH NOTHING CAN BRING BACK THE HOUR OF SPLENDOUR IN THE GRASS"],
  ["Buson", "Roof Tiles", "ROOF TILES WORN SMOOTH BY WIND AND RAIN AND TIME", "Burns", "Home", "FROM SCENES LIKE THESE OLD SCOTIAS GRANDEUR SPRINGS THAT MAKES HER"],
  // ── Fire & Warmth ──
  ["Basho", "Hearth Fire", "THE HEARTH FIRE GLOWS IN THE DARK ROOM", "Blake", "Fire", "BRING ME MY BOW OF BURNING GOLD BRING ME MY ARROWS OF DESIRE"],
  ["Buson", "Forge Heat", "FORGE HEAT THE HAMMER RINGS ON IRON", "Shelley", "Prometheus", "THE CRAWLING GLACIERS PIERCE ME WITH THE SPEARS OF THEIR MOON"],
  ["Issa", "Warm Bowl", "A WARM BOWL OF TEA BETWEEN COLD HANDS", "Dickinson", "Flame", "DARE YOU SEE A SOUL AT THE WHITE HEAT THEN CROUCH WITHIN THE DOOR"],
  ["Shiki", "Ember Glow", "THE EMBER GLOWS LONG AFTER THE FIRE DIES", "Keats", "Burn", "MY SPIRIT IS TOO WEAK MORTALITY WEIGHS HEAVILY ON ME LIKE UNWILLING"],
  ["Basho", "Coal Light", "ONE COAL OF LIGHT IN THE ASH OF NIGHT", "Frost", "Fire", "SOME SAY THE WORLD WILL END IN FIRE SOME SAY IN ICE FROM WHAT IVE"],
  ["Buson", "Hot Spring", "THE HOT SPRING STEAMS IN WINTER AIR AT DAWN", "Byron", "Flame", "THE FIRE THAT ON MY BOSOM PREYS IS LONE AS SOME VOLCANIC ISLE"],
  // ── Ocean & Shore ──
  ["Basho", "Wave Sound", "WAVE SOUND ALL NIGHT AGAINST THE SHORE", "Whitman", "Sea", "YOU SEA I RESIGN MYSELF TO YOU TOO I GUESS WHAT YOU MEAN"],
  ["Buson", "Tide Pool", "TIDE POOL A SMALL WORLD IN THE ROCKS", "Tennyson", "Sea Song", "BREAK BREAK BREAK ON THY COLD GRAY STONES O SEA AND I WOULD THAT"],
  ["Issa", "Sand Crab", "THE SAND CRAB DIGS A NEW HOME EACH TIDE", "Byron", "Ocean", "ROLL ON THOU DEEP AND DARK BLUE OCEAN ROLL TEN THOUSAND FLEETS"],
  ["Shiki", "Salt Wind", "SALT WIND CARRIES THE SMELL OF FAR AWAY", "Dickinson", "Shore", "I STARTED EARLY TOOK MY DOG AND VISITED THE SEA THE MERMAIDS"],
  ["Basho", "Coral Shore", "CORAL AND SHELL LINE THE SHORE IN ROWS", "Shelley", "Sea", "IT IS THE UNPASTURED SEA HUNGERING FOR CALM AND FED WITH MORNING"],
  ["Buson", "Fog Horn", "THE FOG HORN SOUNDS ACROSS THE STILL BAY", "Longfellow", "Tide", "THE TIDE RISES THE TIDE FALLS THE TWILIGHT DARKENS THE CURLEW CALLS"],
  // ── Morning & Evening ──
  ["Basho", "Rooster Crow", "ROOSTER CROW BEFORE THE SUN THE DAY BEGINS", "Dickinson", "Morning", "WILL THERE REALLY BE A MORNING IS THERE SUCH A THING AS DAY"],
  ["Buson", "Dusk Settles", "DUSK SETTLES OVER THE FIELD LIKE A BLANKET", "Keats", "Evening Star", "BRIGHT STAR WOULD I WERE STEADFAST AS THOU ART IN SPLENDOUR"],
  ["Issa", "Late Light", "THE LAST LIGHT FALLS ON THE MOUNTAIN SIDE", "Whitman", "Evening", "DAREST THOU NOW O SOUL WALK OUT WITH ME TOWARD THE UNKNOWN REGION"],
  ["Shiki", "Early Mist", "EARLY MIST HIDES THE RIVER FROM THE ROAD", "Frost", "Twilight", "I HAVE BEEN ONE ACQUAINTED WITH THE NIGHT I HAVE OUTWALKED THE"],
  ["Basho", "Red Sunset", "RED SUNSET THROUGH THE PINE TREES", "Shelley", "Sunset", "THE DAY BECOMES MORE SOLEMN AND SERENE WHEN NOON IS PAST"],
  ["Buson", "Stars Appear", "ONE BY ONE THE STARS APPEAR AT DUSK", "Tennyson", "Vespers", "SUNSET AND EVENING STAR AND ONE CLEAR CALL FOR ME AND MAY THERE BE"],
  // ── Solitude ──
  ["Basho", "Alone Again", "ALONE ON THE ROAD AUTUMN WIND BLOWS", "Frost", "Desert", "THE LONELINESS INCLUDES ME UNAWARES AND SO I FELT MORE ALONE"],
  ["Buson", "One Chair", "ONE CHAIR BY THE WINDOW AFTERNOON SUN", "Dickinson", "Solitude", "THE SOUL SELECTS HER OWN SOCIETY THEN SHUTS THE DOOR"],
  ["Issa", "Night Walk", "NIGHT WALK ONLY MY SHADOW BESIDE ME", "Whitman", "Alone", "I CELEBRATE MYSELF AND SING MYSELF AND WHAT I ASSUME"],
  ["Shiki", "Empty Shore", "EMPTY SHORE JUST THE WIND AND THE WAVES", "Keats", "Solitude", "O SOLITUDE IF I MUST WITH THEE DWELL LET IT NOT BE AMONG"],
  ["Basho", "One Leaf", "ONE LEAF FALLS THE REST HOLD ON STILL", "Shelley", "Aloneness", "I FALL UPON THE THORNS OF LIFE I BLEED A HEAVY WEIGHT OF HOURS"],
  ["Buson", "Fisherman", "THE FISHERMAN WAITS ALONE ON THE PIER", "Tennyson", "Alone", "I AM A PART OF ALL THAT I HAVE MET YET ALL EXPERIENCE IS AN"],
  // ── Rain ──
  ["Basho", "Sudden Rain", "SUDDEN RAIN EVERYONE RUNS FOR SHELTER", "Longfellow", "Rainy Day", "INTO EACH LIFE SOME RAIN MUST FALL SOME DAYS MUST BE DARK AND DREARY"],
  ["Buson", "Soft Rain", "SOFT RAIN ON THE GARDEN PATH AT NIGHT", "Dickinson", "Rain", "LIKE RAIN IT SOUNDED TILL IT CURVED AND THEN I KNEW THE FORM"],
  ["Issa", "Rain Song", "THE RAIN SINGS ITS SONG ON THE OLD TIN ROOF", "Burns", "Rainy Day", "THE PALE MOON IS SETTING BEYOND THE WHITE WAVE AND TIME IS SETTING"],
  ["Shiki", "Wet Stones", "WET STONES SHINE UNDER THE STREET LAMPS", "Blake", "Rain", "AND DID THOSE FEET IN ANCIENT TIME WALK UPON ENGLANDS MOUNTAINS"],
  ["Basho", "Rain Passes", "THE RAIN PASSES AND THE SUN RETURNS", "Frost", "After Rain", "IT TOOK THE SEA AND ME A LONG LONG TIME TO LEARN EACH OTHERS WAY"],
  ["Buson", "Puddle Light", "PUDDLE LIGHT REFLECTS THE CLOUDS ABOVE", "Shelley", "Rain Fall", "I BRING FRESH SHOWERS FOR THE THIRSTING FLOWERS FROM THE SEAS"],
  // ── Insects ──
  ["Basho", "Firefly Light", "FIREFLY LIGHT FADES BEFORE THE DAWN", "Dickinson", "Firefly", "THE LIGHTNING IS A YELLOW FORK FROM TABLES IN THE SKY"],
  ["Buson", "Moth Wings", "THE MOTH BEATS WINGS AGAINST THE LAMP", "Blake", "Fly", "AM NOT I A FLY LIKE THEE OR ART NOT THOU A MAN LIKE ME"],
  ["Issa", "Ant Trail", "THE ANT TRAIL WINDS AROUND THE STONE TO THE HILL", "Frost", "Ant", "DEPARTMENTAL IS THE SORT OF THING FOR ANTS TO BE CONCERNED WITH"],
  ["Shiki", "Bee Hums", "THE BEE HUMS AMONG THE LAST FALL BLOOMS", "Keats", "Bee Song", "THE MURMUROUS HAUNT OF FLIES ON SUMMER EVES CANNOT RECALL"],
  ["Basho", "Silk Worm", "THE SILK WORM SPINS ITS HOME OF THREAD", "Shelley", "Moth", "THE DESIRE OF THE MOTH FOR THE STAR OF THE NIGHT FOR THE MORROW"],
  ["Buson", "Dragonfly Eye", "DRAGONFLY EYES SEE ALL DIRECTIONS AT ONCE", "Whitman", "Insect", "I BELIEVE A LEAF OF GRASS IS NO LESS THAN THE JOURNEY WORK"],
  // ── Harvest & Food ──
  ["Basho", "Rice Fields", "THE RICE FIELDS GLOW GOLD IN AUTUMN LIGHT", "Burns", "Harvest", "WHEN CHILL NOVEMBER BLEAK AND CHEERLESS CAME AND BITING"],
  ["Buson", "Tea Steam", "THE STEAM RISES FROM THE CUP OF TEA", "Keats", "Feast", "FOR SUMMER HAS OVER BRIMMED THEIR CLAMMY CELLS AND BUDDING FRUITS"],
  ["Issa", "Ripe Fruit", "RIPE FRUIT FALLS INTO MY OPEN HAND", "Dickinson", "Bread", "SOME KEEP THE SABBATH GOING TO CHURCH I KEEP IT STAYING AT HOME"],
  ["Shiki", "Herb Garden", "THE HERB GARDEN FILLS THE AIR WITH THYME", "Frost", "Apples", "AFTER APPLE PICKING MY LONG TWO POINTED LADDER IS STICKING THROUGH"],
  ["Basho", "Fresh Bread", "THE SMELL OF FRESH BREAD FROM THE OLD STONE OVEN", "Blake", "Grain", "TO SEE A WORLD IN A GRAIN OF SAND AND A HEAVEN IN A WILD"],
  ["Buson", "Morning Rice", "MORNING RICE THE STEAM CURLS UP LIKE MIST", "Shelley", "Feast", "MY SOUL IS AN ENCHANTED BOAT WHICH LIKE A SLEEPING SWAN DOTH"],
  // ── Night & Darkness ──
  ["Basho", "Dark Temple", "THE DARK TEMPLE STANDS ALONE IN MOONLIGHT", "Shakespeare", "Night", "GOOD NIGHT GOOD NIGHT PARTING IS SUCH SWEET SORROW THAT I SHALL"],
  ["Buson", "Night River", "THE NIGHT RIVER CARRIES REFLECTIONS AWAY", "Shelley", "Darkness", "WHEN THE LAMP IS SHATTERED THE LIGHT IN THE DUST LIES DEAD"],
  ["Issa", "Owl Calls", "THE OWL CALLS TWICE FROM THE OLD DARK PINE", "Dickinson", "Night", "WE GROW ACCUSTOMED TO THE DARK WHEN LIGHT IS PUT AWAY"],
  ["Shiki", "Lamp Oil", "THE LAMP OIL BURNS LOW THE PAGE GOES DARK", "Frost", "Night", "ACQUAINTED WITH THE NIGHT I HAVE WALKED OUT IN RAIN AND BACK"],
  ["Basho", "Midnight Bell", "MIDNIGHT BELL THE LAST ECHO FADES TO NOTHING", "Blake", "Night", "THE STARS THREW DOWN THEIR SPEARS AND WATERED HEAVEN WITH THEIR"],
  ["Buson", "Dark Woods", "DARK WOODS AT NIGHT NOT EVEN THE WIND MOVES", "Keats", "Darkness", "DARKLING I LISTEN AND FOR MANY A TIME I HAVE BEEN HALF IN LOVE"],
  // ── Colors ──
  ["Basho", "Red Bridge", "THE RED BRIDGE OVER THE GREEN RIVER BELOW", "Blake", "Gold", "HE WHO BINDS TO HIMSELF A JOY DOES THE WINGED LIFE DESTROY"],
  ["Buson", "Blue Iris", "THE BLUE IRIS OPENS IN THE GREY DAWN LIGHT", "Shakespeare", "Green", "WHEN DAISIES PIED AND VIOLETS BLUE AND LADY SMOCKS ALL SILVER WHITE"],
  ["Issa", "White Crane", "THE WHITE CRANE STANDS IN THE DARK WATER STILL", "Shelley", "Colors", "LIFE LIKE A DOME OF MANY COLOURED GLASS STAINS THE WHITE RADIANCE"],
  ["Shiki", "Gold Carp", "THE GOLD CARP TURNS BENEATH THE DARK WATER", "Dickinson", "Purple", "SHE SWEEPS WITH MANY COLORED BROOMS AND LEAVES THE SHREDS BEHIND"],
  ["Basho", "Silver Moon", "SILVER MOON ABOVE THE BLACK PINE TREES", "Keats", "Bright", "A THING OF BEAUTY IS A JOY FOREVER ITS LOVE WILL NEVER PASS"],
  ["Buson", "Amber Light", "AMBER LIGHT FALLS THROUGH THE AUTUMN LEAVES", "Whitman", "Hues", "GIVE ME THE SPLENDID SILENT SUN WITH ALL HIS BEAMS FULL DAZZLING"],
  // ── Growth ──
  ["Basho", "Seed Splits", "THE SEED SPLITS OPEN REACHING FOR LIGHT", "Blake", "Seed", "THE APPLE TREE NEVER ASKS THE BEECH HOW HE SHALL GROW NOR THE"],
  ["Buson", "Roots Dig", "THE ROOTS DIG DEEP BELOW THE FROZEN SOIL", "Frost", "Growth", "NATURE IS ALWAYS HINTING AT US IT HINTS OVER AND OVER AGAIN"],
  ["Issa", "Sprout Grows", "THE SMALL SPROUT GROWS TOWARD THE SUN EACH DAY", "Dickinson", "Bloom", "A WORD IS DEAD WHEN IT IS SAID SOME SAY I SAY IT JUST BEGINS"],
  ["Shiki", "Vine Climbs", "THE VINE CLIMBS THE WALL ONE LEAF AT A TIME", "Shelley", "Spring Growth", "THE FLOWERS THAT SMILE TODAY TOMORROW DIE ALL THAT WE WISH TO"],
  ["Basho", "Bamboo Shoot", "BAMBOO SHOOTS PUSH THROUGH HARD GROUND", "Whitman", "Grass", "A CHILD SAID WHAT IS THE GRASS FETCHING IT TO ME WITH FULL HANDS"],
  ["Buson", "New Bud", "THE NEW BUD HOLDS THE FUTURE BLOOM", "Keats", "Growth", "THE POETRY OF EARTH IS NEVER DEAD WHEN ALL THE BIRDS ARE FAINT"],
  // ── Work & Craft ──
  ["Basho", "Brush Stroke", "ONE BRUSH STROKE CAPTURES THE MOUNTAIN", "Shelley", "Art", "POETRY LIFTS THE VEIL FROM THE HIDDEN BEAUTY OF THE WORLD"],
  ["Buson", "Kiln Fire", "THE KILN FIRE SHAPES THE CLAY INTO FORM", "Blake", "Creation", "NO BIRD SOARS TOO HIGH IF HE SOARS WITH HIS OWN WINGS IN THE SKY"],
  ["Issa", "Worn Tools", "WORN TOOLS SHAPED BY THE HANDS THAT USE THEM", "Dickinson", "Work", "I DWELL IN POSSIBILITY A FAIRER HOUSE THAN PROSE MORE NUMEROUS"],
  ["Shiki", "Loom Clicks", "THE LOOM CLICKS AND THE THREAD GROWS INTO CLOTH", "Whitman", "Craft", "I HEAR AMERICA SINGING THE VARIED CAROLS I HEAR EACH SINGING"],
  ["Basho", "Stone Mason", "THE STONE MASON SHAPES EACH BLOCK BY HAND", "Keats", "Making", "HEARD MELODIES ARE SWEET BUT THOSE UNHEARD ARE SWEETER PLAY ON"],
  ["Buson", "Paper Fold", "EACH FOLD OF PAPER HOLDS A NEW SHAPE INSIDE", "Frost", "Building", "MEN WORK TOGETHER WHETHER THEY WORK TOGETHER OR APART"],
  // ── Music & Sound ──
  ["Basho", "Flute Song", "THE FLUTE SONG DRIFTS ACROSS THE LAKE", "Shakespeare", "Music", "IF MUSIC BE THE FOOD OF LOVE PLAY ON GIVE ME EXCESS OF IT"],
  ["Buson", "Wind Chime", "THE WIND CHIME RINGS IN THE EMPTY HOUSE", "Shelley", "Music", "MUSIC WHEN SOFT VOICES DIE VIBRATES IN THE MEMORY ODOURS"],
  ["Issa", "Drum Beat", "THE DRUM BEATS ONCE AND THEN THE SILENCE COMES", "Blake", "Song", "AND DID THOSE FEET IN ANCIENT TIME WALK UPON ENGLANDS MOUNTAINS"],
  ["Shiki", "Bell Rings", "THE BELL RINGS CLEAR ACROSS THE SNOWY FIELD", "Dickinson", "Sound", "A WORD IS DEAD WHEN IT IS SAID SOME SAY I SAY IT JUST BEGINS TO"],
  ["Basho", "Rain Music", "RAIN MAKES MUSIC ON THE BAMBOO LEAVES", "Keats", "Melody", "HEARD MELODIES ARE SWEET BUT THOSE UNHEARD ARE SWEETER STILL PLAY"],
  ["Buson", "String Hums", "THE LAST STRING HUMS LONG AFTER THE SONG ENDS", "Whitman", "Sing", "I HEAR AMERICA SINGING THE VARIED CAROLS I HEAR THOSE OF MECHANICS"],
  // ── Children ──
  ["Basho", "Paper Boat", "THE PAPER BOAT SAILS DOWN THE GUTTER STREAM", "Blake", "Child", "PIPING DOWN THE VALLEYS WILD PIPING SONGS OF PLEASANT GLEE"],
  ["Buson", "Kite String", "THE KITE STRING HUMS IN THE SPRING WIND", "Wordsworth", "Child", "THE CHILD IS FATHER OF THE MAN AND I COULD WISH MY DAYS TO BE"],
  ["Issa", "Mud Pies", "MUD PIES DRYING IN THE SUN BY THE DOOR", "Dickinson", "Youth", "WE NEVER KNOW HOW HIGH WE ARE TILL WE ARE CALLED TO RISE"],
  ["Shiki", "Skip Stones", "SKIP STONES ACROSS THE POND ONE TWO THREE", "Frost", "Child", "THE LAND WAS OURS BEFORE WE WERE THE LANDS SHE WAS OUR LAND"],
  ["Basho", "Swing Set", "THE EMPTY SWING MOVES IN THE WIND ALONE", "Shelley", "Youth", "WHEN THE LAMP IS SHATTERED THE LIGHT IN THE DUST LIES DEAD WHEN"],
  ["Buson", "Chalk Lines", "CHALK LINES ON THE STREET FADE IN THE RAIN", "Tennyson", "Youth", "IN THE SPRING A YOUNG MANS FANCY LIGHTLY TURNS TO THOUGHTS OF LOVE"],
  // ── Endings & Beginnings ──
  ["Basho", "Gate Closes", "THE GATE CLOSES BEHIND ME IN THE DARK", "Shakespeare", "Endings", "ALL THE WORLDS A STAGE AND ALL THE MEN AND WOMEN MERELY PLAYERS"],
  ["Buson", "New Ink", "NEW INK IN THE OLD STONE WELL FRESH START", "Dickinson", "Begin", "I AM NOBODY WHO ARE YOU ARE YOU NOBODY TOO THEN THERES A PAIR"],
  ["Issa", "Old Path", "THE OLD PATH LEADS TO SOMEWHERE NEW TODAY", "Shelley", "Rebirth", "THE TRUMPET OF A PROPHECY O WIND IF WINTER COMES CAN SPRING"],
  ["Shiki", "Last Page", "THE LAST PAGE TURNED A NEW BOOK WAITS", "Tennyson", "End", "THE OLD ORDER CHANGETH YIELDING PLACE TO NEW AND GOD FULFILS HIMSELF"],
  ["Basho", "Dawn Again", "DAWN COMES AGAIN THE SAME SUN RISES", "Frost", "New Day", "IN THREE WORDS I CAN SUM UP EVERYTHING ABOUT LIFE IT GOES ON"],
  ["Buson", "Cracked Pot", "THE CRACKED POT STILL HOLDS WATER FOR THE FLOWERS", "Whitman", "Renewal", "HENCEFORTH I ASK NOT GOOD FORTUNE I MYSELF AM GOOD FORTUNE HENCEFORTH"],
  // ── Aging ──
  ["Basho", "Grey Hair", "GREY HAIR BUT THE HEART STILL BEATS STRONG", "Shakespeare", "Age", "WHEN FORTY WINTERS SHALL BESIEGE THY BROW AND DIG DEEP TRENCHES"],
  ["Buson", "Worn Hands", "THESE WORN HANDS STILL KNOW THEIR CRAFT WELL", "Yeats", "Old Age", "WHEN YOU ARE OLD AND GREY AND FULL OF SLEEP AND NODDING BY THE FIRE"],
  ["Issa", "Walking Stick", "MY WALKING STICK AND I LEAN ON EACH OTHER", "Frost", "Years", "THE AFTERNOON KNOWS WHAT THE MORNING NEVER SUSPECTED AT ALL"],
  ["Shiki", "Old Mirror", "THE OLD MIRROR SHOWS WHO I HAVE BECOME", "Dickinson", "Time", "BECAUSE I COULD NOT STOP FOR DEATH HE KINDLY STOPPED FOR ME"],
  ["Basho", "Autumn Years", "IN AUTUMN YEARS THE SMALLEST THINGS MATTER", "Tennyson", "Late Years", "OLD AGE HATH YET HIS HONOUR AND HIS TOIL DEATH CLOSES ALL"],
  ["Buson", "Last Leaf", "THE LAST LEAF CLINGS TO THE BRANCH IN WIND", "Longfellow", "Twilight", "THE DAY IS DONE AND THE DARKNESS FALLS FROM THE WINGS OF NIGHT"],
  // ── Rivers & Streams ──
  ["Basho", "River Bends", "THE RIVER BENDS AROUND THE OLD STONE MILL", "Tennyson", "River", "I COME FROM HAUNTS OF COOT AND HERN I MAKE A SUDDEN SALLY"],
  ["Buson", "Stream Bed", "THE STREAM BED DRY NOW MARKS THE SPRING RAIN PATH", "Burns", "River", "FLOW GENTLY SWEET AFTON AMONG THY GREEN BRAES FLOW GENTLY"],
  ["Issa", "Water Fall", "THE WATER FALLS DOWN AND DOWN WITHOUT REST", "Shelley", "River Song", "THE FOUNTAINS MINGLE WITH THE RIVER AND THE RIVERS WITH THE OCEAN"],
  ["Shiki", "Ford Stones", "FORD STONES WET AND SLICK UNDER BARE FEET", "Frost", "West Brook", "IT FLOWS FROM ONE UNDER A SPELL TO HOLD THE COURSE AND KEEP"],
  ["Basho", "Boat Drifts", "THE SMALL BOAT DRIFTS ON THE STILL RIVER", "Whitman", "River", "JUST AS YOU FEEL WHEN YOU LOOK ON THE RIVER AND SKY SO I FELT"],
  ["Buson", "Reeds Bend", "THE REEDS BEND IN THE CURRENT OF THE STREAM", "Keats", "Stream", "WHERE SHALL I LEARN TO GET MY PEACE AGAIN TO BANISH THOUGHTS"],
  // ── Childhood & Play ──
  ["Basho", "Spinning Top", "THE SPINNING TOP WOBBLES THEN FALLS STILL", "Blake", "Play", "IN THE MORNING I RISE WITH THE LARK AND IN THE EVENING SING"],
  ["Buson", "Hide Seek", "HIDE AND SEEK THE TREE IS HOME BASE", "Dickinson", "Game", "I TOOK ONE DRAUGHT OF LIFE I TELL YOU WHAT I PAID AND WHAT IT WAS"],
  ["Issa", "Soap Bubble", "THE SOAP BUBBLE FLOATS UP AND THEN POPS", "Frost", "Play", "TWO ROADS DIVERGED IN A WOOD AND I I TOOK THE ROAD LESS TRAVELED"],
  ["Shiki", "Ball Bounce", "THE BALL BOUNCES HIGH OVER THE OLD FENCE", "Shelley", "Childhood", "WE LOOK BEFORE AND AFTER AND PINE FOR WHAT IS NOT OUR SINCEREST"],
  // ── Gratitude & Joy ──
  ["Basho", "Warm Sun", "WARM SUN ON MY BACK NOTHING MORE NEEDED", "Blake", "Thankful", "CAN I SEE ANOTHERS WOE AND NOT BE IN SORROW TOO CAN I SEE"],
  ["Buson", "Bird Song", "THE BIRDS SONG ASKS FOR NOTHING IN RETURN", "Dickinson", "Joy", "I FIND ECSTASY IN LIVING THE MERE SENSE OF LIVING IS JOY ENOUGH"],
  ["Issa", "Full Bowl", "A FULL BOWL OF RICE NOTHING MORE IS NEEDED", "Keats", "Happiness", "A THING OF BEAUTY IS A JOY FOREVER ITS LOVELINESS INCREASES NEVER"],
  ["Shiki", "Simple Day", "A SIMPLE DAY WITH NOTHING TO PROVE TO ANYONE", "Whitman", "Grateful", "I EXIST AS I AM THAT IS ENOUGH IF NO OTHER IN THE WORLD BE AWARE"],
  // ── Clouds ──
  ["Basho", "Cloud Watch", "CLOUDS DRIFT PAST SHAPES FORMING AND GONE", "Shelley", "Cloud", "I AM THE DAUGHTER OF EARTH AND WATER AND THE NURSLING OF THE SKY"],
  ["Buson", "Storm Clouds", "STORM CLOUDS GATHER OVER THE DARK GREEN HILLS", "Keats", "Cloud", "THE POETRY OF EARTH IS CEASING NEVER ON A LONE WINTER EVENING WHEN"],
  ["Issa", "Thin Clouds", "THIN CLOUDS LIKE SILK ACROSS THE BLUE SKY", "Wordsworth", "Cloud", "I WANDERED LONELY AS A CLOUD THAT FLOATS ON HIGH OERVALES AND HILLS"],
  ["Shiki", "Cloud Break", "THE CLOUDS BREAK APART AND THE SUN FLOODS IN", "Dickinson", "Sky", "THERE IS ANOTHER SKY EVER SERENE AND FAIR AND THERE IS ANOTHER"],
  // ── Moss & Stones ──
  ["Basho", "Moss Path", "THE MOSS PATH SOFT AND GREEN LEADS UP", "Frost", "Stone Wall", "GOOD FENCES MAKE GOOD NEIGHBOURS SAID THE OLD MAN DARKLY"],
  ["Buson", "Grave Stones", "OLD GRAVE STONES LEAN AND NAMES FADE SLOWLY", "Shelley", "Ruins", "NOTHING BESIDE REMAINS ROUND THE DECAY OF THAT COLOSSAL WRECK"],
  ["Issa", "Rock Pool", "THE ROCK POOL HOLDS A TINY WORLD OF LIFE", "Dickinson", "Stone", "HOW HAPPY IS THE LITTLE STONE THAT RAMBLES IN THE ROAD ALONE"],
  ["Shiki", "Lichen Grows", "LICHEN GROWS ON THE NORTH SIDE OF THE STONE", "Whitman", "Earth", "PRESS CLOSE BARE BOSOMED NIGHT PRESS CLOSE MAGNETIC NOURISHING"],
  // ── Bridges ──
  ["Basho", "Stone Bridge", "THE STONE BRIDGE ARCHES OVER THE DARK STREAM", "Longfellow", "Bridge", "I STOOD ON THE BRIDGE AT MIDNIGHT AS THE CLOCKS WERE STRIKING"],
  ["Buson", "Rope Bridge", "THE ROPE BRIDGE SWAYS IN THE MOUNTAIN WIND", "Blake", "Crossing", "THE ROAD OF EXCESS LEADS TO THE PALACE OF WISDOM AND TRUTH"],
  ["Issa", "Log Bridge", "A LOG BRIDGE SPANS THE RUSHING BROOK BELOW", "Frost", "Bridge", "WE MAKE OURSELVES A PLACE APART BEHIND LIGHT WORDS THAT TEASE"],
  ["Shiki", "Rail Bridge", "THE RAIL BRIDGE HUMS AS THE TRAIN DRAWS NEAR", "Dickinson", "Crossing", "EXULTATION IS THE GOING OF AN INLAND SOUL TO SEA PAST THE HOUSES"],
  // ── Twilight ──
  ["Basho", "Purple Dusk", "PURPLE DUSK THE BATS COME OUT TO FLY", "Tennyson", "Twilight", "SUNSET AND EVENING STAR AND ONE CLEAR CALL FOR ME AND MAY THERE"],
  ["Buson", "Long Shadow", "LONG SHADOWS STRETCH ACROSS THE EMPTY FIELD", "Frost", "Dusk", "THE WEST WAS GETTING OUT OF GOLD THE BREATHS OF STARS WERE COLD"],
  ["Issa", "Lamp Lighter", "THE LAMP LIGHTER WALKS HIS NIGHTLY ROUTE", "Dickinson", "Evening", "THERE CAME A WIND LIKE A BUGLE IT QUIVERED THROUGH THE GRASS"],
  ["Shiki", "Smoke Rises", "SMOKE RISES FROM THE CHIMNEY INTO DUSK", "Shelley", "Night Falls", "SWIFTLY WALK OVER THE WESTERN WAVE SPIRIT OF NIGHT AND FROM"],
  // ── Sand & Desert ──
  ["Basho", "Sand Dune", "THE SAND DUNE SHIFTS WITH EVERY GUST OF WIND", "Shelley", "Desert", "NOTHING BESIDE REMAINS ROUND THE DECAY OF THAT COLOSSAL WRECK BOUNDLESS"],
  ["Buson", "Dry Wash", "THE DRY WASH TELLS WHERE WATER RAN BEFORE", "Frost", "Sand", "SAND DUNES HOLD THEIR SHAPE AGAINST THE WIND AND RAIN AND STORMS"],
  ["Issa", "Cactus Bloom", "THE CACTUS BLOOMS ONCE THEN WAITS A YEAR", "Dickinson", "Sand", "THE BRAIN IS WIDER THAN THE SKY FOR PUT THEM SIDE BY SIDE"],
  ["Shiki", "Mirage Heat", "MIRAGE HEAT WAVES BEND THE ROAD AHEAD", "Byron", "Desert Sun", "THE ASSYRIAN CAME DOWN LIKE THE WOLF ON THE FOLD AND HIS COHORTS"],
  // ── Still Life ──
  ["Basho", "Bowl of Fruit", "A BOWL OF FRUIT SITS ON THE WOODEN TABLE", "Blake", "Innocence", "TO SEE A WORLD IN A GRAIN OF SAND AND A HEAVEN IN WILDFLOWER"],
  ["Buson", "Ink Brush", "THE INK BRUSH RESTS BESIDE THE BLANK PAGE", "Keats", "Urn", "THOU STILL UNRAVISHED BRIDE OF QUIETNESS THOU FOSTER CHILD"],
  ["Issa", "Thread Spool", "THE THREAD SPOOL ROLLS ACROSS THE FLOOR", "Dickinson", "Needle", "I FELT A FUNERAL IN MY BRAIN AND MOURNERS TO AND FRO KEPT"],
  ["Shiki", "Clay Cup", "THE CLAY CUP HOLDS THE TEA JUST RIGHT", "Frost", "Object", "THE FACT IS THE SWEETEST DREAM THAT LABOUR KNOWS MY LONG SCYTHE"],
  // ── Fishing ──
  ["Basho", "Cast Line", "THE CAST LINE ARCS OVER THE QUIET STREAM", "Whitman", "Fishing", "I THINK I COULD TURN AND LIVE WITH ANIMALS THEY ARE SO PLACID"],
  ["Buson", "Float Bobs", "THE FLOAT BOBS ONCE AND THEN GOES UNDER", "Tennyson", "Fisher", "SUNSET AND EVENING STAR AND ONE CLEAR CALL FOR ME AT SEA"],
  ["Issa", "Net Full", "THE NET IS FULL OF SILVER FLASHING FISH", "Frost", "Brook Fish", "THE WAY A CROW SHOOK DOWN ON ME THE DUST OF SNOW FROM A HEMLOCK"],
  ["Shiki", "Boat Hook", "THE BOAT HOOK PULLS THE CATCH ABOARD", "Dickinson", "Water", "WE NEVER KNOW HOW HIGH WE ARE TILL WE ARE CALLED TO RISE AND THEN"],
  // ── Maps & Compass ──
  ["Basho", "Old Map", "THE OLD MAP SHOWS ROADS THAT NO LONGER EXIST", "Shelley", "Compass", "THE GREAT INSTRUMENT OF MORAL GOOD IS THE IMAGINATION ALONE"],
  ["Buson", "North Star", "NORTH STAR ABOVE THE TREE LINE HOLDING FAST", "Blake", "Direction", "IF THE SUN AND MOON SHOULD DOUBT THEY WOULD IMMEDIATELY GO OUT"],
  ["Issa", "Trail Mark", "A TRAIL MARK CARVED INTO THE OAK TREE BARK", "Frost", "Paths", "HOME IS THE PLACE WHERE WHEN YOU HAVE TO GO THERE THEY TAKE YOU"],
  ["Shiki", "Compass Spins", "THE COMPASS SPINS THEN POINTS THE WAY NORTH", "Dickinson", "Navigate", "NOT KNOWING WHEN THE DAWN WILL COME I OPEN EVERY DOOR AND WAIT"],
  // ── Weaving & Thread ──
  ["Basho", "Silk Thread", "THE SILK THREAD CATCHES THE MORNING LIGHT", "Dickinson", "Thread", "I FELT A CLEAVING IN MY MIND AS IF MY BRAIN HAD SPLIT AND JOINED"],
  ["Buson", "Loom Song", "THE LOOM SINGS AS THE SHUTTLE FLIES BACK AND FORTH", "Blake", "Weave", "BRING ME MY BOW OF BURNING GOLD BRING ME MY ARROWS OF DESIRE TO"],
  ["Issa", "Knot Tied", "THE KNOT IS TIED WITH CARE AND PULLED TIGHT", "Shelley", "Tapestry", "LIFE LIKE A DOME OF MANY COLOURED GLASS STAINS THE WHITE RADIANCE"],
  ["Shiki", "Needle Eye", "THREAD THROUGH THE NEEDLE EYE ON THE FIRST TRY", "Keats", "Weaving", "A THING OF BEAUTY IS A JOY FOREVER ITS LOVELINESS INCREASES AND WILL"],
  // ── Boats & Sailing ──
  ["Basho", "Sail Fills", "THE SAIL FILLS WITH WIND AND WE ARE OFF", "Whitman", "Ship", "O CAPTAIN MY CAPTAIN OUR FEARFUL TRIP IS DONE THE SHIP HAS"],
  ["Buson", "Anchor Up", "ANCHOR UP THE TIDE IS TURNING NOW", "Tennyson", "Sailing", "COME MY FRIENDS IT IS NOT TOO LATE TO SEEK A NEWER WORLD PUSH OFF"],
  ["Issa", "Oar Dips", "THE OAR DIPS INTO THE DARK STILL WATER", "Frost", "Boat", "TWO LOOK AT TWO EACH ONE WHAT EACH ONE WAS AND THE WALL BETWEEN"],
  ["Shiki", "Harbor Lights", "HARBOR LIGHTS GUIDE THE LAST BOATS HOME", "Shelley", "Voyage", "WE ARE AS CLOUDS THAT VEIL THE MIDNIGHT MOON HOW RESTLESSLY THEY"],
  // ── Breath & Air ──
  ["Basho", "Deep Breath", "ONE DEEP BREATH THE PINE TREES SWAY", "Blake", "Air", "THE THANKLESS MUSE BEGINS HER MORNING TASK AND WAKES THE WORLD"],
  ["Buson", "Cold Breath", "COLD BREATH HANGS IN THE STILL WINTER AIR", "Shelley", "Breath", "IF WINTER COMES CAN SPRING BE FAR BEHIND THE TRUMPET OF PROPHECY"],
  ["Issa", "Wind Sighs", "THE WIND SIGHS THROUGH THE EMPTY ROOMS", "Dickinson", "Air", "TELL ALL THE TRUTH BUT TELL IT SLANT SUCCESS IN CIRCUIT LIES IN"],
  ["Shiki", "Clear Air", "CLEAR AIR AFTER THE STORM EACH LEAF SHINES", "Keats", "Breath", "BRIGHT STAR WOULD I WERE STEADFAST AS THOU ART IN SPLENDOUR HUNG"],
  // ── Friendship ──
  ["Basho", "Two Cups", "TWO CUPS OF TEA BESIDE THE FIRE", "Emerson", "Friendship", "THE ONLY WAY TO HAVE A FRIEND IS TO BE ONE YOURSELF FIRST"],
  ["Buson", "Shared Meal", "A SHARED MEAL UNDER THE AUTUMN MOON", "Dickinson", "Friend", "MY FRIENDS ARE MY ESTATE FORGIVE ME THEN THE AVARICE TO HOARD THEM"],
  ["Issa", "Old Friend", "AN OLD FRIEND VISITS AND WE SIT IN SILENCE", "Shakespeare", "Friend", "THOSE FRIENDS THOU HAST AND THEIR ADOPTION TRIED GRAPPLE THEM TO"],
  ["Shiki", "Two Paths", "TWO PATHS MERGE INTO ONE BY THE OLD BRIDGE", "Whitman", "Companion", "I AND MY FANCY FREE THE ROAD IS BEFORE US GIVING EVERYTHING TO ALL"],
  // ── Patience ──
  ["Basho", "Bamboo Waits", "THE BAMBOO WAITS FOR SPRING UNDER SNOW", "Longfellow", "Patience", "THE HEIGHTS BY GREAT MEN REACHED AND KEPT WERE NOT ATTAINED"],
  ["Buson", "Stone Wears", "STONE WEARS SMOOTH UNDER RUNNING WATER", "Blake", "Patience", "THE BIRD A NEST THE SPIDER A WEB AND MAN HAS FRIENDSHIP IN THE WORLD"],
  ["Issa", "Seeds Sleep", "THE SEEDS SLEEP BELOW THE FROZEN GROUND", "Dickinson", "Waiting", "THEY SAY THAT TIME ASSUAGES TIME NEVER DID ASSUAGE AN ACTUAL"],
  ["Shiki", "River Carves", "THE RIVER CARVES THE STONE OVER LONG YEARS", "Tennyson", "Endure", "TO STRIVE TO SEEK TO FIND AND NOT TO YIELD THAT IS THE GOAL"],
  // ── Impermanence ──
  ["Basho", "Dew Vanish", "DEW ON THE GRASS VANISHED BY NOON", "Shelley", "Mutability", "WE ARE AS CLOUDS THAT VEIL THE MIDNIGHT MOON HOW RESTLESSLY"],
  ["Buson", "Smoke Ring", "THE SMOKE RING BREAKS APART IN THE AIR", "Shakespeare", "Fleeting", "LIKE AS THE WAVES MAKE TOWARDS THE PEBBLED SHORE SO DO OUR MINUTES"],
  ["Issa", "Bubble Pops", "THE BUBBLE POPS AND NOTHING REMAINS AT ALL", "Keats", "Passing", "WHERE ARE THE SONGS OF SPRING AY WHERE ARE THEY THINK NOT"],
  ["Shiki", "Sand Castle", "THE SAND CASTLE WAITS FOR THE NEXT WAVE", "Frost", "Nothing Gold", "NATURES FIRST GREEN IS GOLD HER HARDEST HUE TO HOLD"],
  // ── Teaching & Learning ──
  ["Basho", "Student Asks", "THE STUDENT ASKS THE MASTER POINTS AT THE MOON", "Blake", "Inquiry", "THE TIGERS OF WRATH ARE WISER THAN THE HORSES OF INSTRUCTION"],
  ["Buson", "Chalk Dust", "CHALK DUST FLOATS IN THE BEAM OF SUN", "Dickinson", "Learning", "SURGEONS MUST BE VERY CAREFUL WHEN THEY TAKE THE KNIFE BENEATH"],
  ["Issa", "First Step", "THE FIRST STEP IS THE HARDEST ONE TO TAKE", "Frost", "Teaching", "EDUCATION IS THE ABILITY TO LISTEN TO ALMOST ANYTHING WITHOUT"],
  ["Shiki", "Blank Page", "THE BLANK PAGE HOLDS ALL THAT COULD EVER BE", "Shelley", "Knowledge", "POETS ARE THE UNACKNOWLEDGED LEGISLATORS OF THE WORLD IN TRUTH"],
  // ── Stars (additional) ──
  ["Basho", "Pole Star", "THE POLE STAR HOLDS WHILE ALL ELSE TURNS", "Shakespeare", "Stars", "DOUBT THOU THE STARS ARE FIRE DOUBT THE SUN DOTH MOVE DOUBT TRUTH"],
  ["Buson", "Shooting Star", "A SHOOTING STAR THEN DARK AGAIN", "Whitman", "Cosmos", "A VAST SIMILITUDE INTERLOCKS ALL AND SHALL FOREVER SPAN THEM"],
  ["Issa", "Star Gazing", "STAR GAZING THE NECK ACHES BUT THE SOUL SINGS", "Tennyson", "Stars", "MANY A NIGHT I SAW THE PLEIADS RISING THROUGH THE MELLOW SHADE"],
  ["Shiki", "Night Glow", "THE NIGHT GLOWS WITH A THOUSAND DISTANT SUNS", "Frost", "Star", "CHOOSE SOMETHING LIKE A STAR TO STAY OUR MINDS ON AND BE STAID"],
  // ── Courage ──
  ["Basho", "Storm Walks", "INTO THE STORM I WALK AND FEEL ALIVE", "Shakespeare", "Courage", "COWARDS DIE MANY TIMES BEFORE THEIR DEATHS THE VALIANT NEVER"],
  ["Buson", "Cliff Edge", "CLIFF EDGE THE WIND PUSHES BACK HARD", "Shelley", "Brave", "THE SOUL OF MAN IS LIKE THE ROLLING WORLD ONE HALF IN DAY THE OTHER"],
  ["Issa", "Dark Cave", "INTO THE DARK CAVE ONE STEP AT A TIME", "Dickinson", "Daring", "WE NEVER KNOW HOW HIGH WE ARE TILL WE ARE CALLED TO RISE AND THEN"],
  ["Shiki", "Rapids Rush", "THE RAPIDS RUSH BUT THE ROCKS HOLD FIRM", "Whitman", "Strength", "KEEP YOUR FACE ALWAYS TOWARD THE SUNSHINE AND SHADOWS WILL FALL"],
  // ── Bells & Clocks ──
  ["Basho", "Clock Chimes", "THE CLOCK CHIMES ONCE IN THE STILL HOUSE", "Tennyson", "Bells", "RING OUT WILD BELLS TO THE WILD SKY THE FLYING CLOUD THE FROSTY LIGHT"],
  ["Buson", "Town Bell", "THE TOWN BELL RINGS AND THE MARKET OPENS", "Frost", "Time", "BUT I HAVE PROMISES TO KEEP AND MILES TO GO BEFORE I SLEEP"],
  ["Issa", "Ship Bell", "THE SHIP BELL SOUNDS THE WATCH HAS CHANGED", "Shelley", "Chimes", "THE WORLD IS TOO MUCH WITH US LATE AND SOON IN GETTING AND SPENDING"],
  ["Shiki", "Wind Bell", "THE WIND BELL DANCES IN THE SUMMER BREEZE", "Dickinson", "Clock", "A CLOCK STOPPED NOT THE MANTELS GENEVA DOCTOR NUMB THE PULSE OF"],
  // ── Fields & Meadows ──
  ["Basho", "Open Field", "THE OPEN FIELD STRETCHES UNDER THE WIDE SKY", "Wordsworth", "Field", "A HOST OF GOLDEN DAFFODILS BESIDE THE LAKE BENEATH THE TREES"],
  ["Buson", "Wheat Waves", "THE WHEAT WAVES IN THE WIND LIKE A GOLD SEA", "Burns", "Field", "NOW SPRING HAS CLAD THE GROVE IN GREEN AND STREWED THE LEA WITH"],
  ["Issa", "Tall Grass", "TALL GRASS HIDES THE PATH FROM VIEW", "Whitman", "Prairie", "GIVE ME THE SPLENDID SILENT SUN WITH ALL HIS BEAMS FULL"],
  ["Shiki", "Wild Herb", "WILD HERBS GROW ALONG THE STONE WALL EDGE", "Dickinson", "Meadow", "I TASTE A LIQUOR NEVER BREWED FROM TANKARDS SCOOPED IN PEARL"],
  // ── Echoes ──
  ["Basho", "Canyon Echo", "THE CANYON ECHOES BACK MY SINGLE SHOUT", "Shelley", "Echo", "MAKE ME THY LYRE EVEN AS THE FOREST IS WHAT IF MY LEAVES ARE FALLING"],
  ["Buson", "Hall Echo", "THE EMPTY HALL ECHOES EACH FOOT STEP", "Shakespeare", "Sound", "THE QUALITY OF MERCY IS NOT STRAINED IT DROPPETH AS THE GENTLE"],
  ["Issa", "Voice Fades", "MY VOICE FADES INTO THE MOUNTAIN MIST", "Keats", "Echo", "MY HEART ACHES AND A DROWSY NUMBNESS PAINS MY SENSE AS THOUGH"],
  ["Shiki", "Drum Echo", "THE DRUM ECHOES ACROSS THE VALLEY FLOOR", "Whitman", "Resonance", "I SOUND MY BARBARIC YAWP OVER THE ROOFTOPS OF THE WORLD AT LARGE"],
  // ── Gates & Doors ──
  ["Basho", "Red Gate", "THE RED GATE OPENS TO THE SHRINE WITHIN", "Blake", "Door", "IF THE DOORS OF PERCEPTION WERE CLEANSED EVERYTHING WOULD APPEAR"],
  ["Buson", "Iron Gate", "THE IRON GATE RUSTS BUT STILL IT HOLDS", "Dickinson", "Door", "I NEVER SAW A MOOR I NEVER SAW THE SEA YET KNOW I HOW THE"],
  ["Issa", "Barn Door", "THE BARN DOOR SWINGS WIDE TO THE MORNING SUN", "Frost", "Gate", "BEFORE I BUILT A WALL I WOULD ASK TO KNOW WHAT I WAS WALLING"],
  ["Shiki", "Screen Door", "THE SCREEN DOOR BANGS SHUT IN THE WIND", "Tennyson", "Threshold", "COME MY FRIENDS IT IS NOT TOO LATE TO SEEK A NEWER WORLD AND"],
  // ── Mist & Fog ──
  ["Basho", "Fog Bank", "THE FOG BANK ROLLS IN FROM THE COLD SEA", "Dickinson", "Fog", "THE FOG COMES ON LITTLE CAT FEET IT SITS LOOKING OVER HARBOR"],
  ["Buson", "Mist Clears", "THE MIST CLEARS AND THE PEAK APPEARS ABOVE", "Shelley", "Mist", "AWAY THE MOOR IS DARK BENEATH THE MOON RAPID CLOUDS HAVE DRUNK"],
  ["Issa", "Valley Fog", "VALLEY FOG HIDES THE RIVER UNTIL NOON", "Frost", "Haze", "THE WAY A CROW SHOOK DOWN ON ME THE DUST OF SNOW FROM A HEMLOCK TREE"],
  ["Shiki", "Sea Fog", "SEA FOG WRAPS THE LIGHTHOUSE IN GREY", "Whitman", "Mist", "I AM HE THAT WALKS WITH THE TENDER AND GROWING NIGHT PRESS CLOSE"],
  // ── Shadows ──
  ["Basho", "Tree Shadow", "THE TREE SHADOW MOVES ACROSS THE YARD", "Blake", "Shadow", "FOR MERCY HAS A HUMAN HEART PITY A HUMAN FACE AND LOVE THE HUMAN"],
  ["Buson", "Sun Dial", "THE SUN DIAL READS THE SHADOW OF TIME", "Shakespeare", "Shade", "IF WE SHADOWS HAVE OFFENDED THINK BUT THIS AND ALL IS MENDED"],
  ["Issa", "Cloud Shadow", "A CLOUD SHADOW CROSSES THE OPEN FIELD", "Shelley", "Shadow", "THE ONE REMAINS THE MANY CHANGE AND PASS HEAVENS LIGHT FOREVER"],
  ["Shiki", "Lamp Shadow", "THE LAMP CASTS SHADOWS LONG ON THE BARE WALL", "Dickinson", "Shadow", "THERE IS A CERTAIN SLANT OF LIGHT WINTER AFTERNOONS THAT OPPRESSES"],
  // ── Seeds & Soil ──
  ["Basho", "Dark Soil", "DARK SOIL UNDER MY NAILS FROM THE GARDEN", "Blake", "Soil", "TO CREATE A LITTLE FLOWER IS THE LABOUR OF AGES BUT TO HOLD IT"],
  ["Buson", "Seed Pods", "THE SEED PODS CRACK OPEN IN THE HOT SUN", "Dickinson", "Seeds", "FAME IS A BEE IT HAS A SONG IT HAS A STING AH TOO IT HAS A WING"],
  ["Issa", "Plowed Row", "THE PLOWED ROW WAITS FOR THE FIRST SPRING RAIN", "Frost", "Sowing", "NATURE IS ALWAYS HINTING AT US IT HINTS OVER AND OVER AND OVER"],
  ["Shiki", "Acorn Falls", "THE ACORN FALLS FROM THE OAK INTO THE STREAM", "Shelley", "Growth", "IF WINTER COMES CAN SPRING BE FAR BEHIND O WILD WEST WIND THOU"],
  // ── Hands ──
  ["Basho", "Open Hands", "OPEN HANDS RECEIVE THE FALLING RAIN", "Whitman", "Hands", "IS THIS THEN A TOUCH QUIVERING ME TO A NEW IDENTITY FLAMES"],
  ["Buson", "Rough Palms", "ROUGH PALMS FROM YEARS OF WORKING STONE", "Burns", "Labour", "TO SEE HER IS TO LOVE HER AND LOVE BUT HER FOREVER FOR NATURE"],
  ["Issa", "Small Hand", "A SMALL HAND HOLDS A LARGE ROUND STONE", "Dickinson", "Touch", "I FELT A FUNERAL IN MY BRAIN AND MOURNERS TO AND FRO THEY KEPT"],
  ["Shiki", "Folded Hands", "FOLDED HANDS IN THE QUIET TEMPLE REST", "Keats", "Hands", "WHEN I HAVE FEARS THAT I MAY CEASE TO BE BEFORE MY PEN HAS GLEANED"],
  // ── Wells & Springs ──
  ["Basho", "Spring Water", "THE SPRING WATER TASTES OF STONE AND MOSS", "Frost", "Spring", "I HAVE BEEN ONE ACQUAINTED WITH THE NIGHT I WALKED OUT IN RAIN"],
  ["Buson", "Deep Well", "THE DEEP WELL HOLDS THE SKY IN ITS DARK EYE", "Dickinson", "Well", "A WELL A WELL A DEEP WELL IT IS WHOSE WATERS LIE BELOW ALL"],
  ["Issa", "Hot Spring", "THE HOT SPRING STEAMS AND THE SNOW FALLS SOFT", "Shelley", "Source", "MY SOUL IS AN ENCHANTED BOAT WHICH LIKE A SLEEPING SWAN DOTH FLOAT"],
  ["Shiki", "Bucket Down", "THE BUCKET DROPS DOWN INTO THE DARK BELOW", "Blake", "Water", "WATER WATER EVERY WHERE AND ALL THE BOARDS DID SHRINK WATER"],
  // ── Dust & Ash ──
  ["Basho", "Road Dust", "ROAD DUST SETTLES ON THE PILGRIMS HAT", "Shakespeare", "Dust", "GOLDEN LADS AND GIRLS ALL MUST AS CHIMNEY SWEEPERS COME TO DUST"],
  ["Buson", "Ash Pile", "THE ASH PILE GLOWS AFTER THE FIRE GOES OUT", "Shelley", "Ash", "FROM THE ASHES OF THE PAST THE PHOENIX RISES ON ITS WINGS"],
  ["Issa", "Swept Floor", "THE SWEPT FLOOR SHOWS THE GRAIN OF THE OLD WOOD", "Dickinson", "Dust", "AMPLE MAKE THIS BED MAKE THIS BED WITH AWE IN IT WAIT TILL JUDGMENT"],
  ["Shiki", "Dusty Book", "THE DUSTY BOOK OPENS TO A PRESSED FLOWER", "Frost", "Ashes", "THE WAY A CROW SHOOK DOWN ON ME DUST OF SNOW FROM HEMLOCK TREE"],
  // ── Walls & Fences ──
  ["Basho", "Stone Wall", "THE STONE WALL MARKS THE EDGE OF THE FARM", "Frost", "Wall", "SOMETHING THERE IS THAT DOES NOT LOVE A WALL THAT SENDS THE FROZEN"],
  ["Buson", "Fence Post", "THE FENCE POST LEANS BUT DOES NOT FALL DOWN", "Dickinson", "Boundary", "THE SOUL SELECTS HER OWN SOCIETY THEN SHUTS THE DOOR ON HER DIVINE"],
  ["Issa", "Ivy Wall", "THE IVY CLIMBS THE CRUMBLING BRICK WALL", "Shelley", "Ruin", "MY NAME IS OZYMANDIAS KING OF KINGS LOOK ON MY WORKS YE MIGHTY"],
  ["Shiki", "Hedge Row", "THE HEDGE ROW BLOOMS WHITE IN LATE SPRING", "Blake", "Garden Wall", "A ROBIN RED BREAST IN A CAGE PUTS ALL HEAVEN IN A RAGE AND FURY"],
  // ── Steps & Stairs ──
  ["Basho", "Step by Step", "STEP BY STEP UP THE MOUNTAIN PATH", "Longfellow", "Stairs", "THE HEIGHTS BY GREAT MEN REACHED AND KEPT WERE NOT ATTAINED BY"],
  ["Buson", "Worn Stairs", "THE WORN STAIRS TELL OF MANY YEARS OF FEET", "Frost", "Steps", "THE BEST WAY OUT IS ALWAYS THROUGH THE DARK AND DIFFICULT PART"],
  ["Issa", "First Stair", "THE FIRST STAIR CREAKS UNDER MY WEIGHT", "Dickinson", "Ascent", "WE NEVER KNOW HOW HIGH WE ARE TILL WE ARE ASKED TO RISE AND THEN"],
  ["Shiki", "Down Hill", "DOWN HILL THE PATH IS EASY BUT THE VIEW", "Shelley", "Climb", "THE SOUL OF MAN IS LIKE THE ROLLING WORLD ONE HALF IN DAY THE"],
  // ── Mirrors ──
  ["Basho", "Still Water", "STILL WATER MIRRORS THE AUTUMN TREES", "Shakespeare", "Mirror", "ALL THE WORLDS A STAGE AND ALL THE MEN AND WOMEN MERELY PLAYERS"],
  ["Buson", "Bronze Mirror", "THE BRONZE MIRROR HOLDS THE LAMP LIGHT", "Shelley", "Reflection", "LIFE LIKE A DOME OF MANY COLOURED GLASS STAINS THE WHITE"],
  ["Issa", "Ice Mirror", "THE FROZEN LAKE MIRRORS THE GREY WINTER SKY", "Dickinson", "Glass", "TELL ALL THE TRUTH BUT TELL IT SLANT SUCCESS IN CIRCUIT LIES IN"],
  ["Shiki", "Window Glass", "IN THE WINDOW GLASS MY FACE AND THE RAIN", "Keats", "Seeing", "THEN FELT I LIKE SOME WATCHER OF THE SKIES WHEN A NEW PLANET SWIMS"],
  // ── Candles & Lanterns ──
  ["Basho", "Paper Lamp", "THE PAPER LAMP GLOWS SOFT IN THE DARK HALL", "Blake", "Lantern", "THE SUN DOES NOT RISE IT IS WE WHO TURN AND LEAN INTO THE LIGHT"],
  ["Buson", "Wax Drips", "THE WAX DRIPS DOWN THE CANDLE SLOW AND WARM", "Dickinson", "Candle", "THE SOUL SHOULD ALWAYS STAND AJAR THAT IF THE HEAVEN INQUIRE"],
  ["Issa", "Night Lamp", "THE NIGHT LAMP FLICKERS THEN BURNS STEADY", "Shelley", "Light", "THE DESIRE OF THE MOTH FOR THE STAR OF THE NIGHT FOR THE MORROW"],
  ["Shiki", "Shrine Light", "SHRINE LIGHT THROUGH THE TREES AT EVENING GLOW", "Frost", "Glow", "WE DANCE ROUND IN A RING AND SUPPOSE THE SECRET SITS IN THE MIDDLE"],
  // ── Wheels & Roads ──
  ["Basho", "Cart Track", "THE CART TRACK RUTS MARK THE OLD ROAD WELL", "Whitman", "Road", "AFOOT AND LIGHT HEARTED I TAKE TO THE OPEN ROAD HEALTHY AND FREE"],
  ["Buson", "Mill Wheel", "THE MILL WHEEL TURNS IN THE RUSHING WATER", "Dickinson", "Wheel", "I FELT A FUNERAL IN MY BRAIN AND MOURNERS TO AND FRO KEPT TREADING"],
  ["Issa", "Bike Trail", "THE BIKE TRAIL CURVES ALONG THE GREEN RIVER", "Frost", "Travel", "THE ROAD NOT TAKEN HAS MADE ALL THE DIFFERENCE IN MY LIFE"],
  ["Shiki", "Dust Cloud", "THE DUST CLOUD MARKS WHERE THE HORSE RAN BY", "Shelley", "Journey", "NOTHING IN THE WORLD IS SINGLE ALL THINGS BY A LAW DIVINE IN ONE"],
];

export function getPuzzlePool(difficulty: string): PuzzleDef[] {
  const off = TYPE_OFFSET[difficulty] ?? 0;
  const diff = (difficulty as Difficulty) ?? "haiku";
  return POEMS.map((p, i) => {
    const prefix = diff === "haiku" ? "h" : "p";
    const id = `${prefix}${String(i + 1).padStart(3, "0")}`;
    const rand = seededRandom(`serpentine:layout:${id}`);
    return expand(p[off], p[off + 1], p[off + 2], id, diff, rand);
  });
}

export function getPuzzle(difficulty: string, index: number): PuzzleDef {
  const off = TYPE_OFFSET[difficulty] ?? 0;
  const diff = (difficulty as Difficulty) ?? "haiku";
  const i = index % POEMS.length;
  const p = POEMS[i];
  const prefix = diff === "haiku" ? "h" : "p";
  const id = `${prefix}${String(i + 1).padStart(3, "0")}`;
  const rand = seededRandom(`serpentine:layout:${id}`);
  return expand(p[off], p[off + 1], p[off + 2], id, diff, rand);
}

export function getAuthorForDay(index: number): string {
  return POEMS[index % POEMS.length][0];
}

export function getPoolSize(): number {
  return POEMS.length;
}
