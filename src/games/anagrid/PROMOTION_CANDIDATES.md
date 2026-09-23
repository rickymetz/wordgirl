# Approved promotions

Decided by interview: pool size "everything that passes the filters";
plurals allowed; a past-tense or -ing word only when paired with a base
word (so SORTED/STORED leaves the existing pool, and ten Tier A families
with two verb forms drop out); Tier B and the extra family words hand-picked.
CARING/RACING stays: CARING reads as an adjective and RACING as a noun.

**127 families added, pool 168** — 175 promoted words; 302 words need clues.

```
actors   → costar, castor
aliens   → saline
ashore   → hoarse
badger   → barged
barely   → barley, bleary
blamed   → bedlam
boiler   → reboil
breast   → barest
breath   → bather
bridal   → ribald
bruise   → buries, busier, rubies
busted   → debuts
buster   → brutes, tubers, rebuts
candle   → lanced
cartel   → claret
castle   → cleats
chains   → chinas
charts   → starch
cinema   → anemic, iceman
clears   → scaler
cursed   → crudes
dancer   → craned
dances   → ascend
deacon   → canoed
debris   → brides
detail   → dilate, tailed
detour   → routed, toured
diaper   → paired, repaid
donate   → atoned
drives   → divers
drones   → snored
editor   → rioted, triode
failed   → afield
faster   → strafe
filter   → lifter, trifle
finest   → infest
finger   → fringe
forces   → fresco
formed   → deform
freaks   → fakers
friend   → finder
gifted   → fidget
golden   → longed
grapes   → pagers
grunts   → strung
hearts   → earths, haters
hustle   → sleuth
images   → ageism
inches   → niches
insult   → sunlit
itself   → stifle, filets
lasted   → deltas
layers   → relays, slayer
layout   → outlay
linked   → kindle
listed   → delist
locker   → relock
lovers   → solver
maiden   → median
marble   → ramble
medals   → damsel
mental   → lament, mantle
minute   → minuet
mister   → merits, timers, remits
morals   → molars
neural   → unreal
novels   → sloven
oceans   → canoes
ordeal   → loader, reload
others   → throes
owners   → worsen
parcel   → placer
parent   → entrap
partly   → paltry
patron   → tarpon
planes   → panels
planet   → platen
plates   → staple, petals, pastel, pleats, palest
player   → replay, pearly
posted   → depots, despot
poster   → presto, tropes
praise   → aspire
priest   → stripe, sprite, ripest
prince   → pincer
prints   → sprint
remind   → minder
result   → luster, rustle
retain   → retina
rifles   → fliers, lifers
rights   → girths
runway   → unwary
sample   → maples
scored   → decors, coders, credos
scrape   → capers, recaps, spacer, pacers
scream   → creams
search   → arches, chaser
senior   → nosier
serial   → sailer
shared   → dasher
shovel   → hovels
shrine   → shiner
signal   → aligns
silver   → livers, sliver
slower   → lowers
snatch   → chants
solemn   → lemons, melons
sought   → toughs
spider   → prides
stance   → ascent
stared   → trades, treads
starve   → averts
streak   → skater, takers
strike   → trikes
stroke   → stoker
subtle   → bustle, bluest, sublet
throne   → hornet
traced   → redact
traces   → crates, caster, reacts, recast
trance   → nectar, canter, recant
trials   → trails
tribes   → biters
unable   → nebula
voters   → strove, troves
waters   → waster
winter   → twiner
wolves   → vowels
wonder   → downer
```

# Anagrid — pool promotion shortlist

The live pool is 42 families; the 60-day repeat gap needs 60+. This is
the reviewed shortlist from the 301 families that were one promotion
away (full list at the bottom).

**Tier A — recommended (115 families).** Everyday words on both sides.
Every family here was run through the real generator and makes a
strict, late-stall daily. Promoting all of Tier A takes the pool from
42 to **157 families** — a family returns every 157 days. Take any 18+
to clear the 60-day bar.

**Tier B — your call (40 families).** Real words, but rarer, dated,
regional or jargon-ish (CLARET, TARPON, PLATEN...). Fine as extra
variety, not needed for the gap.

**Excluded.** Everything else in the full list, for one of:
- the partner is obscure (DAUBES, SCROTA, TAROCS, GNOMIC...);
- the common word is a proper noun the frequency list let in (GERMAN,
  DANISH, GIBSON, HOLDEN, MERLIN, MARCEL, PALMER, HECTOR, SLATER, SIGNOR);
- a sensitive or unpleasant answer (RACIST, RECTAL, SCROTA);
- British spelling (LUSTRE, OCHRES, MITRES, NITRES, LIVRES, BISTRE, AFTERS).

For each family you keep: its promoted words go in `PROMOTED_WORDS`
(`engine/families.ts`), and BOTH sides need 2-3 clues in
`engine/clues.ts` (`clues.test.ts` enforces it) — the common side was
never in a family before, so it has none yet. Then freeze the schedule
(DESIGN.md, "Before launch").

Format: `common word → promoted word(s)`.

## Tier A — recommended

```
actors   → costar
aliens   → saline
ashore   → hoarse
barely   → barley, bleary
blamed   → ambled, bedlam
breast   → barest
bruise   → buries, busier, rubies
busted   → debuts
buster   → brutes, tubers
carved   → craved
castle   → cleats
caused   → sauced
charts   → starch
chased   → cashed
cinema   → anemic
dancer   → craned
dances   → ascend
deacon   → canoed
debris   → brides
detail   → dilate, tailed
detour   → routed, toured
diaper   → paired, repaid
donate   → atoned
drives   → divers
drones   → snored
failed   → afield
faster   → strafe
filter   → lifter, trifle
finest   → infest
finger   → fringe
forces   → fresco
formed   → deform
framed   → farmed
friend   → finder
gifted   → fidget
golden   → longed
grapes   → pagers
grunts   → strung
hearts   → earths, haters
hustle   → sleuth
images   → ageism
inches   → niches
insult   → sunlit
itself   → stifle
lasted   → salted, slated, deltas
layers   → relays, slayer
layout   → outlay
linked   → kindle
lovers   → solver
maiden   → median
marble   → ramble
mashed   → shamed
mating   → taming
medals   → damsel
mental   → lament, mantle
minute   → minuet
mister   → merits, timers
morals   → molars
neural   → unreal
oceans   → canoes
ordeal   → loader, reload
others   → throes
owners   → worsen
parent   → entrap
partly   → paltry
planes   → panels
plates   → staple, petals, pastel, pleats
player   → replay
posted   → depots, despot
poster   → presto, tropes
praise   → aspire
priest   → stripe, sprite
prince   → pincer
prints   → sprint
remind   → minder
result   → luster, rustle
retain   → retina
rifles   → fliers
rights   → girths
ruling   → luring
runway   → unwary
sample   → maples
scored   → decors, coders
scrape   → capers, recaps, spacer
scream   → creams
search   → arches, chaser
senior   → nosier
shaped   → phased
shovel   → hovels
shrine   → shiner
signal   → aligns
silver   → livers, sliver
slower   → lowers
smiled   → misled
snatch   → chants
solemn   → lemons, melons
spider   → prides
stance   → ascent
stared   → trades, treads
starve   → averts
streak   → skater, takers
stroke   → stoker
subtle   → bustle, bluest, sublet
throne   → hornet
traced   → carted, crated, redact
traces   → crates, caster, reacts, recast
trance   → nectar, canter, recant
trials   → trails
tribes   → biters
unable   → nebula
united   → untied
voters   → strove, troves
waters   → waster
wolves   → vowels
wonder   → downer
```

## Tier B — your call

```
actors   → castor
badger   → barged
boiler   → reboil
boring   → robing
breath   → bather
bridal   → ribald
buster   → rebuts
candle   → lanced
cartel   → claret
chains   → chinas
choked   → hocked
cinema   → iceman
clears   → scaler
cursed   → crudes
editor   → rioted, triode
freaks   → fakers
itself   → filets
listed   → silted, delist
locker   → relock
mental   → mantel
mister   → remits
novels   → sloven
parcel   → placer
patron   → tarpon
planet   → platen
plates   → palest
player   → parley, pearly
prices   → precis
priest   → ripest
rifles   → lifers
scored   → credos
scrape   → pacers
serial   → sailer
shared   → dasher
sought   → toughs
stance   → secant
starve   → vaster
strike   → trikes
throne   → nother
winter   → twiner
```

## Full candidate list

```
abused   + daubes
action   + atonic, cation
actors   + castor, costar, scrota, tarocs
advise   + visaed
aliens   + alines, elains, lianes, saline, silane
almost   + smalto, stomal
amends   + desman, menads
amount   + outman
anchor   + archon, rancho
answer   + resawn
armies   + aimers, ramies
ashore   + ahorse, hoarse
asking   + gaskin, kiangs
aspect   + epacts
badger   + barged, garbed
barely   + barley, bleary
betray   + baryte
blamed   + ambled, bedlam, beldam, lambed
blares   + balers, blears
blouse   + boules, obelus
boards   + adsorb, broads, dobras
bodies   + dobies
boiled   + bolide
boiler   + reboil
boring   + orbing, robing
brains   + bairns
breast   + barest, baster, tabers
breath   + bather, bertha
bridal   + ribald
bridge   + begird
bronze   + bonzer
bruise   + buries, busier, rubies
buried   + burdie, rubied
busted   + bestud, debuts
buster   + brutes, burets, rebuts, tubers
buyers   + rebuys
candle   + lanced
carbon   + corban
carpet   + preact
cartel   + claret, rectal
carved   + craved
castle   + cleats, eclats
caused   + sauced
chains   + chinas
chairs   + rachis
chapel   + pleach
charts   + starch
chased   + cashed
chiefs   + fiches
chimes   + miches
choked   + hocked
chores   + cosher, ochers, ochres
cinema   + anemic, iceman
clause   + caules
clears   + carles, lacers, scaler, sclera
client   + lectin, lentic
closer   + ceorls, cresol
clumsy   + muscly
combat   + tombac
coming   + gnomic
consul   + clonus
corpse   + copers
covers   + corves
cradle   + credal, reclad
creaks   + crakes, sacker, screak
cruise   + curies
cursed   + crudes
dancer   + cedarn, craned, nacred
dances   + ascend
danish   + sandhi
daring   + gradin
deacon   + acnode, canoed
deaths   + hasted
debris   + biders, brides, rebids
demons   + mondes
detail   + dilate, tailed
detour   + redout, routed, toured
diaper   + paired, pardie, repaid
domain   + daimon
donate   + atoned
donuts   + stound
douche   + ouched
dreams   + dermas, madres
dreamt   + marted
driven   + verdin
drives   + divers
drones   + redons, snored, sonder, sorned
during   + ungird
eating   + ingate
editor   + dotier, rioted, triode
ethics   + itches
failed   + afield
falcon   + flacon
faster   + afters, strafe
father   + hafter, trefah
faults   + flatus
fields   + felids
filter   + lifter, trifle
finest   + feints, infest
finger   + fringe
fisher   + sherif
flames   + fleams
flower   + reflow, wolfer
fluids   + sulfid
forces   + fresco
formed   + deform
framed   + farmed
freaks   + fakers
freaky   + fakery
friend   + finder, redfin, refind
german   + engram, manger, ragmen
giants   + gainst, sating
gibson   + bingos
gifted   + fidget
golden   + longed
grapes   + gapers, gasper, pagers, parges, sparge
greasy   + gyrase, yagers
grunts   + strung
guards   + gradus
hearts   + earths, haters
hector   + rochet, rotche, tocher, troche
heroic   + coheir
hockey   + chokey
holden   + hondle
honest   + ethnos
hunger   + rehung
hustle   + sleuth
images   + ageism
inches   + chines, niches
inmate   + etamin, tamein
insert   + estrin, inerts, inters, niters, nitres, sinter, triens, trines
insult   + sunlit
itself   + filets, fliest, flites, stifle
jasper   + japers
joking   + jingko
kidney   + dinkey
kindly   + dinkly
lasted   + deltas, desalt, salted, slated, staled
launch   + nuchal
layers   + relays, slayer
laying   + gainly
layout   + outlay
legion   + eloign
lifted   + flited
linked   + kilned, kindle
listed   + delist, idlest, silted, tildes
locker   + relock
losing   + soling
louder   + loured
lovers   + solver
loving   + voling
maiden   + aidmen, daimen, median, medina
marble   + ambler, blamer, lamber, ramble
marcel   + calmer
marked   + demark
mashed   + shamed
mating   + taming
medals   + damsel, lameds
mental   + lament, mantel, mantle
merlin   + limner
minute   + minuet, mutine
mister   + merits, miters, mitres, remits, smiter, timers
mobile   + emboli
modern   + normed, rodmen
morals   + molars
neural   + unreal
nickel   + nickle
notice   + noetic
novels   + sloven
obtain   + bonita
oceans   + canoes
oldest   + stoled
openly   + poleyn
orange   + onager
ordeal   + loader, reload
others   + horste, reshot, throes
owners   + resown, rowens, worsen
palmer   + ampler
parcel   + carpel, placer
parent   + arpent, enrapt, entrap, trepan
parish   + raphis
partly   + paltry, raptly
patron   + parton, tarpon
pearls   + lapser, parles
period   + dopier
perish   + reship
petrol   + replot
phrase   + raphes, seraph, shaper, sherpa
pigeon   + epigon
planes   + panels
planet   + platen
plates   + palest, palets, pastel, petals, pleats, septal, staple, tepals
player   + parley, pearly, replay
plenty   + pentyl
points   + pinots, pintos, piston, pitons, postin, spinto
polite   + piolet
posing   + gipons, pingos
posted   + depots, despot, stoped
poster   + presto, repots, respot, stoper, topers, tropes
poured   + rouped
praise   + aspire, paries, spirea
prayed   + drapey
preach   + eparch
prices   + cripes, precis, spicer
priest   + esprit, ripest, sprite, stripe, tripes
prince   + pincer
prints   + sprint
prison   + orpins, prions, spinor
punish   + unship
racist   + crista, triacs
racket   + retack, tacker
raised   + aiders, deairs, irades, redias, resaid
random   + rodman
reason   + arseno, senora
reckon   + conker
regain   + earing, gainer, reagin
remind   + minder
result   + luster, lustre, rustle, sutler, ulster
retain   + ratine, retina
rifles   + filers, fliers, lifers
rights   + girths, griths
risked   + dikers
routes   + ouster, outers, souter, stoure
ruined   + inured
ruling   + luring
runway   + unwary
sacked   + casked
sample   + maples
sawyer   + swayer
scored   + coders, credos, decors
scrape   + capers, crapes, escarp, pacers, parsec, recaps, secpar, spacer
scream   + creams, macers
search   + arches, chares, chaser, eschar
second   + codens
senior   + irones, nosier
serial   + ariels, resail, sailer, serail
sewing   + swinge
shaped   + hasped, pashed, phased
shared   + dasher, shader
shovel   + hovels
shower   + reshow
shrine   + shiner
signal   + algins, aligns, lasing, liangs, ligans, lingas
signor   + girons, grison, groins, rosing, soring
silver   + ervils, livers, livres, sliver
simple   + impels
simply   + limpsy
single   + ingles
slater   + alerts, alters, artels, estral, laster, ratels, salter, staler, stelar, talers
slogan   + logans
slower   + lowers, rowels
smiled   + misled, slimed
smiley   + limeys
snatch   + chants, stanch
sneaky   + snakey
sniper   + repins, ripens
snitch   + chints
solemn   + lemons, melons
sought   + oughts, toughs
spider   + prides, prised, redips, spired
sponge   + pengos
squire   + quires, risque
squirt   + quirts
staged   + gasted
stance   + ascent, enacts, secant
stared   + daters, derats, trades, treads
starve   + averts, traves, vaster
stolen   + lentos, telson
streak   + skater, strake, takers
strike   + kiters, trikes
stroke   + stoker, tokers, trokes
subtle   + bluest, bluets, bustle, butles, sublet
tailor   + rialto
throne   + hornet, nother
throws   + rowths, whorts, worths
towers   + worset
traced   + carted, crated, redact
traces   + carets, cartes, caster, caters, crates, reacts, recast
trance   + canter, carnet, centra, nectar, recant, tanrec
travel   + varlet
trials   + trails
tribes   + bestir, bister, bistre, biters
tricks   + strick
trying   + tyring
unable   + nebula
united   + dunite, untied
urgent   + gurnet
values   + avulse
voters   + stover, strove, troves
waited   + dawtie
washed   + shawed
wasted   + tawsed, wadset
waters   + rawest, tawers, waster
whales   + wheals
whites   + swithe, withes
winter   + twiner
wolves   + vowels
wonder   + downer
wounds   + swound
writes   + twiers, wriest
yogurt   + grouty
```
