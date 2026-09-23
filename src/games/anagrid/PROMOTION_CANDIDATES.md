# Anagrid — pool promotion candidates (for review)

The live pool is 42 families; the 60-day repeat gap needs 60+. Each line
below is a common-tier word whose anagram family would join the pool if
ONE of the listed bonus-tier words were promoted into `PROMOTED_WORDS`
(`engine/families.ts`). Most listed words are obscure; the job is to pick
the everyday ones (HOARSE, BARLEY, DEBUTS...) and leave the rest.

For each word you promote:
1. add it to `PROMOTED_WORDS`;
2. add 2-3 clues for it — and for its partner — in `engine/clues.ts`
   (`clues.test.ts` fails until every family word has them);
3. once the pool is big enough, freeze the family order as an
   append-only list (see DESIGN.md, "Before launch") — after that,
   promoting a word must never reorder past days.

Format: `common word + bonus candidates`.

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
