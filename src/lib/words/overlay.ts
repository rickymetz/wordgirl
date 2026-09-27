import { letterMask, type Dictionary } from "./dictionary";

/**
 * Dated corrections layered over dictionary.txt. The file itself never
 * changes for these: every puzzle is derived from the dictionary, so an
 * edit would re-derive every archived day under its saved progress.
 * Instead a game asks for `dictionaryOn(dict, dateKey)` and gets the
 * corrected dictionary only for dates from the epoch on (and for
 * practice, which is minted fresh), the untouched one before it.
 *
 * It is the day AFTER this shipped, so a board already in progress on
 * ship day doesn't change under the player. Sixfold stays on the base
 * dictionary for good: its families are a dated SCHEDULE with a clue
 * per word, so a promoted word would need a clue it doesn't have.
 */
export const DICT_OVERLAY_EPOCH = "2026-09-28";

/**
 * Everyday words the subtitle-frequency gate left in the bonus tier,
 * promoted to REQUIRED. Mostly inflections of required words that
 * ranked apart from their base (hazy beside haze and easy, tacos,
 * cloudy, widely): the corpus ranks every surface form on its own, so a
 * plural or -y form falls below the cut its base clears. Plus
 * nature/kitchen words dialogue under-counts (pear, twig, whisk).
 * Hand-reviewed: crude words, names and oddities left out.
 */
export const PROMOTED_WORDS: readonly string[] = `
  abusing accepts aches aching acorn adapted addicts adjusted admiring
  admits adored adviser aims airs albums alerted ambushed analyzed
  appeals assisted attracts aunts badges bagel barriers baskets
  battered batting battling bearer beauties begs bending bends bids
  biker binding bins blacked blames blanks blasts blazing blindly
  blinds blinking blooming blossoms blushing bodily boils bolts bonded
  booming bossy bottled bows boxers braces brats bravely breaker
  brewing bribed bribes brushed brushing bubbling buckets buds buffer
  bugged buggy builder bulbs bullies bumping bumpy bursts butters cabs
  cages calmed camels captains caress cartoons carts carving casing
  casually catcher centers cheater cheats cherries chewed chilling
  chills clams clans claps classics cleans clips cloudy coaster coded
  coffees collects colleges coloured commonly concerts consumer coping
  cords costing costly cosy courting crates crazier craziest crispy
  crowned crowns cruising cubes cures currents curses cursing curves
  cutest cycles damaging dames darlings dashing dealings decks
  declined defenses delivers denies depended deposits deputies dew
  dialed digest digger disposed diver dodgy donors doses doubles
  doubting doves drafted drifted drinker drumming drying dumps dyed
  earnings earns earthly eater edgy edit eels elbows embraced emerging
  emptied engaging errors escorted exiled expanded explorer exposing
  extras failures fakes fangs fats faucet faulty favours fearing
  fences fibers fielding fig finer fins firms fishes flashes flavors
  fleas fleeting floats flooding floods flushed flushing flyers foggy
  folder folding forks formerly forwards fossils founding fours foxes
  frames frosty frown frying funnier funniest furry furs fussy gags
  gains gaming gaps gases gears geeks gems geniuses gestures giggle
  gigs glued gnat grains greens greeted grin groovy guides guiding
  gulp gums gust hammered handler hauling hawks haze hazy healer heals
  helmets helper hens herring hints hobbies hogs holed hopper horrors
  hosts hugged humbly hunts huts imply impulses infinity insides
  intends interns invading invites irons itching jacks jamming jams
  jars jerky jingling jogging joins joys jumpy kingdoms kittens kiwi
  knead lacked ladle lambs lanes largely lasers latter leagues leaks
  lending lenses licensed licked lifts listener loaned lodged logged
  longed luckiest lumps lunches makers managers mango marbles marched
  markers marking mastered mats meadows melts meows merger messes
  metals minded minding miner misty mixer modesty moods morales
  morally mouthing muffins mugged mugs mules multiply museums myths
  naming nape napkins needless nerds nets numbered nutty oaks observer
  oils oily olives opener operates opposing overly owls owning paces
  paged painters paints panels pans passions patches patrols pats
  peaks pear peeled peer pencils peppers petal picky pictured piercing
  piled piles pinched pines pints pistols pitched pitching pizzas
  planner pleading pleasing plots plugged plugs pods poked polished
  politely ponies ports posed poses posting pottery pours powered
  pranks pretends prevents prophets protests proudly provoked pubs
  puffs pushy puzzles quieter quilt quits raced racer radios raided
  raids rails randomly rascals rating rattles reacting receives
  recipes refers reflects regained regarded releases relying rents
  rescuing resisted rested resulted resumes retainer reviewed rewards
  ribbons rightly rips robes rocked rocker rods rooting rosy rounded
  rowing rows rubbed rugged rulers runners sacks saucer schemes
  scoring scraps screens scripts searches seeker seizures senators
  sensing servers sewers shelters shifted shifting shooters shoving
  shrub shrug shutters sighting silenced simplest singles sinks sitter
  skates skid skins skis slamming slapping slaps sleeper sleet sliced
  slices slimy slowed slows slugs snail snappy snowing snowy snug
  soaking socially softer solely sorting speeds speedy spices spikes
  spilling spins spoiling spoils sponsors spoons squared squares
  stacked staging stained stamped starter stating steadily steamed
  sticker stings stingy stirred stocking stormy strained streams
  strips strokes stuffy summons sums supplier swears sweeter swimmer
  switches tabs tacos tagged tally tattooed tents thicker thorns
  threads tickles ticks tides tights timed tissues toaster tolls tombs
  tones torches tossing touchy touring towed trader trails trashed
  trenches triggers tripping trophies truths tulip tuning twig
  twisting typed uncles unions updated urges users vaguely valleys
  valued vans vents verses versions veterans viewing virtues vitals
  vowed wagons warmed warnings wary washes wasp watering waved weakest
  weights weirdest whipping whisk widely widows wigs wilder wildest
  wildly winding wines wipes wiping wiring wisely witty worldly wraps
  wrecking wrestler yawn zones
`.split(/\s+/).filter(Boolean);

/**
 * Everyday words missing from ENABLE outright (it predates them).
 * Added to the BONUS tier: accepted wherever bonus words are, never
 * required or hinted.
 */
export const ADDED_WORDS: readonly string[] = `
  blogger ebook ebooks email emails emojis hashtag hashtags inbox
  internet login logins logout offline online podcast podcasts selfie
  selfies smartphone spam spammed texted texting username vlog webcam
  website websites
`.split(/\s+/).filter(Boolean);

/** Does the correction apply? `null` is practice / undated play. */
export function overlayApplies(dateKey: string | null): boolean {
  return dateKey === null || dateKey >= DICT_OVERLAY_EPOCH;
}

const cache = new WeakMap<Dictionary, Dictionary>();

/** The dictionary a puzzle for `dateKey` plays against — see above. */
export function dictionaryOn(
  dict: Dictionary,
  dateKey: string | null,
): Dictionary {
  if (!overlayApplies(dateKey)) return dict;
  let out = cache.get(dict);
  if (!out) {
    out = applyOverlay(dict, PROMOTED_WORDS, ADDED_WORDS);
    cache.set(dict, out);
  }
  return out;
}

type TierIndex = Dictionary["required"];

/**
 * Promoted words move from bonus to the END of their required bucket
 * (buckets are commonest-first, and these ranked below the cut); added
 * words join the end of their bonus bucket. Words already in the target
 * tier, or outside the dictionary's length range, are left alone.
 */
export function applyOverlay(
  dict: Dictionary,
  promoted: readonly string[],
  added: readonly string[],
): Dictionary {
  const bonusHas = new Set(
    [...dict.bonus.buckets.values()].flat(),
  );
  const promote = new Set(promoted.filter((w) => bonusHas.has(w)));
  const lengths = new Set(dict.all.buckets.keys());
  const add = added.filter((w) => !dict.has(w) && lengths.has(w.length));

  const required = extend(dict.required, [...promote], () => true);
  const bonus = extend(dict.bonus, add, (w) => !promote.has(w));
  const words = new Set([...dict.all.buckets.values()].flat());
  for (const w of add) words.add(w);
  return {
    required,
    bonus,
    all: extend(required, [...bonus.buckets.values()].flat(), () => true),
    has: (word) => words.has(word),
  };
}

/** A copy of `tier` keeping words that pass `keep`, plus `extra`. */
function extend(
  tier: TierIndex,
  extra: readonly string[],
  keep: (word: string) => boolean,
): TierIndex {
  const buckets = new Map<number, string[]>();
  const masks = new Map<number, number[]>();
  const push = (w: string, m: number) => {
    let b = buckets.get(w.length);
    let ms = masks.get(w.length);
    if (!b || !ms) {
      b = [];
      ms = [];
      buckets.set(w.length, b);
      masks.set(w.length, ms);
    }
    b.push(w);
    ms.push(m);
  };
  for (const [len, bucket] of tier.buckets) {
    const ms = tier.masks.get(len) ?? [];
    bucket.forEach((w, i) => {
      if (keep(w)) push(w, ms[i]);
    });
  }
  for (const w of extra) push(w, letterMask(w));
  return { buckets, masks };
}
