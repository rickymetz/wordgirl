/**
 * The frozen daily schedule: which families exist, and from which CYCLE.
 *
 * Days run in cycles. Cycle c is one seeded shuffle of every family whose
 * `since` <= c, so each family appears once per cycle; a cycle is as many
 * days long as it has families. A family's clue rotates with how many
 * cycles it has been through (`c - since`), so every return gets its
 * next clue.
 *
 * APPEND-ONLY, and only with a FUTURE `since`: that is what keeps past
 * days (and their clues) where they are when the pool grows. Editing or
 * removing an entry, reordering, or appending with a `since` at or before
 * the current cycle reshuffles history and strands archive saves.
 * schedule.test.ts pins the day-by-day sequence so that can't happen
 * silently.
 *
 * Every family `anagramFamilies` returns must be here, and vice versa —
 * so promoting a word (families.ts) also means scheduling its family.
 */
export interface ScheduledFamily {
  /** The family's six letters, sorted (its id). */
  letters: string;
  /** First cycle the family plays in. */
  since: number;
}

export const SCHEDULE: readonly ScheduledFamily[] = [
  { letters: "abdegr", since: 0 }, // badger/barged
  { letters: "abdelm", since: 0 }, // bedlam/blamed
  { letters: "abdilr", since: 0 }, // bridal/ribald
  { letters: "abehrt", since: 0 }, // bather/breath
  { letters: "abekrs", since: 0 }, // brakes/breaks
  { letters: "abelmr", since: 0 }, // marble/ramble
  { letters: "abelnu", since: 0 }, // nebula/unable
  { letters: "abelry", since: 0 }, // barely/barley/bleary
  { letters: "abelst", since: 0 }, // stable/tables
  { letters: "aberst", since: 0 }, // barest/breast
  { letters: "acdeln", since: 0 }, // candle/lanced
  { letters: "acdeno", since: 0 }, // canoed/deacon
  { letters: "acdenr", since: 0 }, // craned/dancer
  { letters: "acdens", since: 0 }, // ascend/dances
  { letters: "acders", since: 0 }, // sacred/scared
  { letters: "acdert", since: 0 }, // redact/traced
  { letters: "acehrs", since: 0 }, // arches/chaser/search
  { letters: "aceimn", since: 0 }, // anemic/cinema/iceman
  { letters: "acelpr", since: 0 }, // parcel/placer
  { letters: "acelrs", since: 0 }, // clears/scaler
  { letters: "acelrt", since: 0 }, // cartel/claret
  { letters: "acelst", since: 0 }, // castle/cleats
  { letters: "acemrs", since: 0 }, // creams/scream
  { letters: "acenos", since: 0 }, // canoes/oceans
  { letters: "acenrt", since: 0 }, // canter/nectar/recant/trance
  { letters: "acenst", since: 0 }, // ascent/stance
  { letters: "aceprs", since: 0 }, // capers/pacers/recaps/scrape/spacer
  { letters: "acerst", since: 0 }, // caster/crates/reacts/recast/traces
  { letters: "acginr", since: 0 }, // caring/racing
  { letters: "achins", since: 0 }, // chains/chinas
  { letters: "achnst", since: 0 }, // chants/snatch
  { letters: "achrst", since: 0 }, // charts/starch
  { letters: "acorst", since: 0 }, // actors/castor/costar
  { letters: "adefil", since: 0 }, // afield/failed
  { letters: "adegnr", since: 0 }, // danger/garden
  { letters: "adehrs", since: 0 }, // dasher/shared
  { letters: "adehrt", since: 0 }, // hatred/thread
  { letters: "adeiln", since: 0 }, // denial/nailed
  { letters: "adeils", since: 0 }, // ideals/ladies/sailed
  { letters: "adeilt", since: 0 }, // detail/dilate/tailed
  { letters: "adeimn", since: 0 }, // maiden/median
  { letters: "adeipr", since: 0 }, // diaper/paired/repaid
  { letters: "adelms", since: 0 }, // damsel/medals
  { letters: "adelor", since: 0 }, // loader/ordeal/reload
  { letters: "adelst", since: 0 }, // deltas/lasted
  { letters: "adenot", since: 0 }, // atoned/donate
  { letters: "adenrw", since: 0 }, // wander/warden/warned
  { letters: "adeprs", since: 0 }, // spared/spread
  { letters: "adeprt", since: 0 }, // depart/parted
  { letters: "aderst", since: 0 }, // stared/trades/treads
  { letters: "adesty", since: 0 }, // stayed/steady
  { letters: "aefkrs", since: 0 }, // fakers/freaks
  { letters: "aefrst", since: 0 }, // faster/strafe
  { letters: "aegims", since: 0 }, // ageism/images
  { letters: "aeglns", since: 0 }, // angels/angles
  { letters: "aegprs", since: 0 }, // grapes/pagers
  { letters: "aehors", since: 0 }, // ashore/hoarse
  { letters: "aehrst", since: 0 }, // earths/haters/hearts
  { letters: "aeilns", since: 0 }, // aliens/saline
  { letters: "aeilrs", since: 0 }, // sailer/serial
  { letters: "aeimnr", since: 0 }, // marine/remain
  { letters: "aeinrt", since: 0 }, // retain/retina
  { letters: "aeiprs", since: 0 }, // aspire/praise
  { letters: "aekrst", since: 0 }, // skater/streak/takers
  { letters: "aelmnt", since: 0 }, // lament/mantle/mental
  { letters: "aelmps", since: 0 }, // maples/sample
  { letters: "aelnps", since: 0 }, // panels/planes
  { letters: "aelnpt", since: 0 }, // planet/platen
  { letters: "aelnrt", since: 0 }, // antler/rental
  { letters: "aelnru", since: 0 }, // neural/unreal
  { letters: "aelpry", since: 0 }, // pearly/player/replay
  { letters: "aelpst", since: 0 }, // palest/pastel/petals/plates/pleats/staple
  { letters: "aelqsu", since: 0 }, // equals/squeal
  { letters: "aelrsy", since: 0 }, // layers/relays/slayer
  { letters: "aemrst", since: 0 }, // master/stream
  { letters: "aenprt", since: 0 }, // entrap/parent
  { letters: "aerstv", since: 0 }, // averts/starve
  { letters: "aerstw", since: 0 }, // waster/waters
  { letters: "agilns", since: 0 }, // aligns/signal
  { letters: "agnors", since: 0 }, // groans/organs
  { letters: "ailnps", since: 0 }, // plains/spinal
  { letters: "ailrst", since: 0 }, // trails/trials
  { letters: "ainrst", since: 0 }, // strain/trains
  { letters: "almors", since: 0 }, // molars/morals
  { letters: "aloprt", since: 0 }, // patrol/portal
  { letters: "alotuy", since: 0 }, // layout/outlay
  { letters: "alprty", since: 0 }, // paltry/partly
  { letters: "amnors", since: 0 }, // ransom/romans
  { letters: "anoprt", since: 0 }, // patron/tarpon
  { letters: "anruwy", since: 0 }, // runway/unwary
  { letters: "bdeirs", since: 0 }, // brides/debris
  { letters: "bdenru", since: 0 }, // burden/burned
  { letters: "bdestu", since: 0 }, // busted/debuts
  { letters: "begins", since: 0 }, // begins/beings
  { letters: "beilor", since: 0 }, // boiler/reboil
  { letters: "beirst", since: 0 }, // biters/tribes
  { letters: "beirsu", since: 0 }, // bruise/buries/busier/rubies
  { letters: "belstu", since: 0 }, // bluest/bustle/sublet/subtle
  { letters: "berstu", since: 0 }, // brutes/buster/rebuts/tubers
  { letters: "cdeirt", since: 0 }, // credit/direct
  { letters: "cdeors", since: 0 }, // coders/credos/decors/scored
  { letters: "cdersu", since: 0 }, // crudes/cursed
  { letters: "cefors", since: 0 }, // forces/fresco
  { letters: "cehins", since: 0 }, // inches/niches
  { letters: "ceinpr", since: 0 }, // pincer/prince
  { letters: "ceinst", since: 0 }, // insect/nicest
  { letters: "ceklor", since: 0 }, // locker/relock
  { letters: "ceorst", since: 0 }, // escort/sector
  { letters: "ceorsu", since: 0 }, // course/source
  { letters: "ckrstu", since: 0 }, // struck/trucks
  { letters: "defgit", since: 0 }, // fidget/gifted
  { letters: "definr", since: 0 }, // finder/friend
  { letters: "defmor", since: 0 }, // deform/formed
  { letters: "degins", since: 0 }, // design/signed
  { letters: "deglno", since: 0 }, // golden/longed
  { letters: "deikln", since: 0 }, // kindle/linked
  { letters: "deilst", since: 0 }, // delist/listed
  { letters: "deimnr", since: 0 }, // minder/remind
  { letters: "deiort", since: 0 }, // editor/rioted/triode
  { letters: "deiprs", since: 0 }, // prides/spider
  { letters: "deirsv", since: 0 }, // divers/drives
  { letters: "deistu", since: 0 }, // duties/suited
  { letters: "delmos", since: 0 }, // models/seldom
  { letters: "denors", since: 0 }, // drones/snored
  { letters: "denorw", since: 0 }, // downer/wonder
  { letters: "deopst", since: 0 }, // depots/despot/posted
  { letters: "deortu", since: 0 }, // detour/routed/toured
  { letters: "efginr", since: 0 }, // finger/fringe
  { letters: "efilrs", since: 0 }, // fliers/lifers/rifles
  { letters: "efilrt", since: 0 }, // filter/lifter/trifle
  { letters: "efilst", since: 0 }, // filets/itself/stifle
  { letters: "efinst", since: 0 }, // finest/infest
  { letters: "eforst", since: 0 }, // forest/foster
  { letters: "eginor", since: 0 }, // ignore/region
  { letters: "eginrs", since: 0 }, // resign/singer
  { letters: "ehinrs", since: 0 }, // shiner/shrine
  { letters: "ehlost", since: 0 }, // hostel/hotels
  { letters: "ehlosv", since: 0 }, // hovels/shovel
  { letters: "ehlstu", since: 0 }, // hustle/sleuth
  { letters: "ehnort", since: 0 }, // hornet/throne
  { letters: "ehorst", since: 0 }, // others/throes
  { letters: "eikrst", since: 0 }, // strike/trikes
  { letters: "eilnst", since: 0 }, // listen/silent
  { letters: "eilrsv", since: 0 }, // livers/silver/sliver
  { letters: "eimntu", since: 0 }, // minuet/minute
  { letters: "eimrst", since: 0 }, // merits/mister/remits/timers
  { letters: "einors", since: 0 }, // nosier/senior
  { letters: "einrtw", since: 0 }, // twiner/winter
  { letters: "eiprst", since: 0 }, // priest/ripest/sprite/stripe
  { letters: "ekorst", since: 0 }, // stoker/stroke
  { letters: "elmnos", since: 0 }, // lemons/melons/solemn
  { letters: "elnosv", since: 0 }, // novels/sloven
  { letters: "elorsv", since: 0 }, // lovers/solver
  { letters: "elorsw", since: 0 }, // lowers/slower
  { letters: "elostw", since: 0 }, // lowest/towels
  { letters: "elosvw", since: 0 }, // vowels/wolves
  { letters: "elrstu", since: 0 }, // luster/result/rustle
  { letters: "enorsw", since: 0 }, // owners/worsen
  { letters: "eoprst", since: 0 }, // poster/presto/tropes
  { letters: "eorstv", since: 0 }, // strove/troves/voters
  { letters: "ghilst", since: 0 }, // lights/slight
  { letters: "ghinst", since: 0 }, // nights/things
  { letters: "ghirst", since: 0 }, // girths/rights
  { letters: "ghostu", since: 0 }, // sought/toughs
  { letters: "gnrstu", since: 0 }, // grunts/strung
  { letters: "ilnstu", since: 0 }, // insult/sunlit
  { letters: "ilopst", since: 0 }, // pilots/pistol
  { letters: "inprst", since: 0 }, // prints/sprint
];
