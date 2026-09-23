/**
 * Two or three clues per word that can be a clued answer — every word of
 * every family (the generator may clue either member). A family returns
 * every `families.length` days; each return takes the next clue in its
 * word's list (`clueFor(word, cycle)`), so a returning player doesn't meet
 * the same line twice in a row.
 *
 * DRAFTS: written by AI, awaiting a human review pass before launch.
 *
 * Style is crossword-grade, "cryptic-lite": straight definitions, double
 * definitions, misdirection, and the odd "?" pun or fill-in-the-blank.
 * The rest of the UI stays plain (house copy rule); the clue is the one
 * place wordplay belongs, because the letter pad already gives the
 * answer's letters away — only a clue with some bite is a challenge.
 *
 * Rules every clue keeps (clues.test.ts enforces the checkable ones):
 * - it fits its own word and NOT the family's other words (HOSTEL and
 *   HOTELS each need a clue the other can't answer);
 * - it never contains a family word;
 * - at most 40 characters — two lines on the clue card at Huge text;
 * - American spelling in the clue itself.
 */
export const CLUES: Readonly<Record<string, readonly string[]>> = {
  angels: ["Halo wearers", "Guardians with wings", "Startup backers, informally"],
  angles: ["Corners measured in degrees", "Fishes (for), as compliments", "Viewpoints a photographer picks"],
  begins: ["Gets under way", "Kicks off", "Starts, as a story"],
  beings: ["Living creatures", "Humans and aliens alike", "Existences"],
  brakes: ["They stop a car", "Slows, with a pedal", "Puts a stop to"],
  breaks: ["Snaps in two", "Recesses", "Lucky ___ (good fortune)"],
  burden: ["A heavy load to carry", "Weighs down", "___ of proof"],
  burned: ["Scorched", "Copied onto a CD", "Dissed, informally"],
  caring: ["Kind and concerned", "Nurturing", "Giving a hoot?"],
  racing: ["Speeding to win", "Pounding, as a heart", "Sport of kings, e.g."],
  course: ["Part of a meal, or of a degree", "Golf venue", "Of ___! (naturally)"],
  source: ["Where something comes from", "A river's origin", "Reporter's informant"],
  credit: ["Recognition for work done", "Buy now, pay later", "Line in a film's closing roll"],
  direct: ["Straight, without detours", "Call the shots on set", "Nonstop, as a flight"],
  danger: ["Risk of harm", "Peril", "What a skull and crossbones means"],
  garden: ["Where flowers grow", "Eden, for one", "Lead up the ___ path"],
  denial: ["Refusal to admit the truth", "Not just a river in Egypt?", "Rejection of a request"],
  nailed: ["Fastened with a hammer", "Aced, informally", "Caught red-handed"],
  depart: ["Leave, as a train", "Head out", "Die, euphemistically"],
  parted: ["Went separate ways", "Like the Red Sea, famously", "Combed into two sides, as hair"],
  design: ["A plan or drawing", "Blueprint", "Intend, or sketch"],
  signed: ["Put a name to", "Autographed", "Joined the team, as a free agent"],
  duties: ["Tasks you're bound to do", "Import taxes", "Chores"],
  suited: ["Well matched", "Dressed for the office?", "Right for the job"],
  equals: ["Is the same as", "Peers", "What the = sign says"],
  squeal: ["High-pitched cry", "Rat on someone", "Sound of a pig or a tire"],
  escort: ["Go along with, for protection", "Usher", "Date to the prom, say"],
  sector: ["A part of the economy", "Pie-slice shape, in geometry", "Zone"],
  forest: ["Land thick with trees", "Can't see it for the trees?", "Woods"],
  foster: ["Care for a child not your own", "Encourage, as growth", "Nurture"],
  groans: ["Sounds of pain or complaint", "Reactions to bad puns", "Moans"],
  organs: ["Heart and lungs, for two", "Church instruments", "Mouthpieces, as newspapers"],
  hatred: ["Intense dislike", "Loathing", "Love's opposite"],
  thread: ["Sewing strand", "Chain of replies online", "Needle's partner"],
  hostel: ["Budget bunk-bed lodging", "Backpackers' dorm", "Youth ___"],
  hotels: ["Chain places with room service", "Inns with lobbies", "Places with concierges"],
  ideals: ["Standards to live up to", "Perfect models", "Principles"],
  ladies: ["Women, politely", "___ first!", "Sign on a restroom door"],
  sailed: ["Crossed the sea by boat", "Breezed (through), as an exam", "Went by yacht"],
  ignore: ["Pay no attention to", "Leave on read, say", "Tune out"],
  region: ["Area of a country", "Zone", "Part of the body, anatomically"],
  insect: ["Six-legged creature", "Ant or bee", "Bug"],
  nicest: ["Most pleasant", "Kindest", "Most agreeable"],
  learnt: ["Studied, in London", "Picked up, as a Brit might say", "Mastered, across the pond"],
  rental: ["Something you lease, like a car", "Apartment you don't own", "Car from the airport lot"],
  lights: ["Lamps and bulbs", "Traffic signals", "Ignites"],
  slight: ["Small", "A snub", "Minor, as a chance"],
  listen: ["Pay attention to a sound", "Lend an ear", "Hear out"],
  silent: ["Making no sound", "Like the K in knife", "Mum"],
  lowest: ["At the very bottom", "Rock-bottom", "Cheapest, as a bid"],
  towels: ["Bathroom dryers", "Bath linens", "Things a quitter throws in?"],
  marine: ["Of the sea", "Oceanic", "Leatherneck"],
  remain: ["Stay behind", "Be left over", "Endure"],
  master: ["Expert at a craft", "Original recording", "Lord of the manor"],
  stream: ["Small river", "Watch online, live", "Brook"],
  models: ["They pose for photographers", "Scale replicas", "Makes of car"],
  seldom: ["Not often", "Rarely", "Hardly ever"],
  nights: ["Hours of darkness", "Evenings", "Arabian ___"],
  things: ["Objects", "Stuff", "Stranger ___ (TV show)"],
  patrol: ["Guard's round", "Police beat", "Walk the perimeter"],
  portal: ["Doorway to another place", "Gateway", "Website entry page"],
  pilots: ["They fly planes", "Test episodes of a TV series", "Steers"],
  pistol: ["Small handgun", "Starter's gun", "Lively person, informally"],
  plains: ["Wide flat grasslands", "Prairies", "Great ___ (US region)"],
  spinal: ["Of the backbone", "___ cord", "Vertebral"],
  ransom: ["Price demanded for a hostage", "Kidnapper's demand", "Hold for ___"],
  romans: ["Caesar's people", "Colosseum crowd", "New Testament letter"],
  resign: ["Quit a job", "Step down", "Accept, as one's fate"],
  singer: ["Vocalist", "Choir member", "Soloist at the mic"],
  sacred: ["Holy", "Hallowed", "Like a cow no one may touch?"],
  scared: ["Frightened", "Spooked", "Chicken"],
  spared: ["Let off, mercifully", "Saved from harm", "Did without, as expense"],
  spread: ["What goes on toast", "Ranch, for one", "Unfold, as wings"],
  stable: ["Steady", "Home for horses", "In good condition, medically"],
  tables: ["Furniture you eat at", "Charts of data", "Postpones, as a motion"],
  stayed: ["Didn't leave", "Remained", "Put up for the night"],
  steady: ["Firm and unshaking", "Going ___ (dating)", "Stable"],
  sorted: ["Put in order", "Alphabetized, e.g.", "Organized"],
  stored: ["Kept for later", "Saved", "Stashed"],
  strain: ["Pull a muscle", "Variety of a virus", "Filter, as pasta"],
  trains: ["They run on rails", "Coaches", "Practices, as an athlete"],
  struck: ["Hit", "Went on strike", "Impressed"],
  trucks: ["Big rigs", "Pickups", "Semis"],
  wander: ["Roam without aim", "Stray", "Drift, as a mind"],
  warden: ["Keeper of a prison", "Game ___", "Guardian"],
  warned: ["Cautioned", "Tipped off", "Gave a heads-up"],
};

/** The clue for `word` on a family's `cycle`-th return. */
export function clueFor(word: string, cycle = 0): string {
  const list = CLUES[word];
  if (!list?.length) return "";
  return list[((cycle % list.length) + list.length) % list.length];
}
