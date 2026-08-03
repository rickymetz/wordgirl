/**
 * Fathom events.
 *
 * Fathom is cookieless and stores nothing per person, and these events
 * keep to that: a name and nothing else, so every one of them is a count
 * on a dashboard rather than a trace of anybody's play. Nothing here
 * carries a date, a score, a word, or a puzzle id.
 *
 * Pageviews are not our business — the script tag in index.html runs with
 * `data-spa="auto"`, so route changes are counted for us. These are the
 * things a pageview cannot see.
 *
 * OFFLINE: the app plays offline; Fathom's script does not load there, so
 * `window.fathom` is undefined and the event is dropped. That is the right
 * trade — queueing play in localStorage to replay later would be exactly
 * the tracking this analytics choice is meant to avoid — but it does mean
 * every number here under-counts offline play. Compare events with events,
 * never events with an absolute idea of how many people played.
 *
 * NAMING: `<gameId>:<action>` for anything a player did inside a game, so
 * the dashboard groups by game. App-level settings carry no game prefix
 * (`setting:font:accessible`) — they are one choice made once, not five.
 */

declare global {
  interface Window {
    fathom?: { trackEvent: (name: string) => void };
  }
}

function track(event: string) {
  window.fathom?.trackEvent(event);
}

// --- Playing a game -------------------------------------------------

export function trackSolved(gameId: string) {
  track(`${gameId}:solved`);
}

export function trackShare(gameId: string) {
  track(`${gameId}:share`);
}

export function trackPractice(gameId: string) {
  track(`${gameId}:practice`);
}

export function trackStarted(gameId: string) {
  track(`${gameId}:started`);
}

export function trackArchivePlay(gameId: string) {
  track(`${gameId}:archive`);
}

// --- The tutorial funnel --------------------------------------------
//
// Four steps, and the gaps between them are the point: `offered` against
// `tutorial-accepted` is how well the first-visit prompt sells the
// tutorial; `started` counts every way in (the prompt, the hub's bento
// tile, the coach sheet's link), so it exceeds `tutorial-accepted` by the
// players who came back for it later.
//
// There is deliberately no `abandoned` event. It would have to fire on
// unmount, which never happens when a tab is closed, so it would report a
// number lower than the truth while looking authoritative. Abandonment is
// `tutorial-started` minus `tutorial-finished` — a subtraction that has no
// blind spot.

/** The first-visit prompt was shown: the denominator for `accepted`. */
export function trackTutorialOffered(gameId: string) {
  track(`${gameId}:tutorial-offered`);
}

/** The player took the offer, rather than skipping or dismissing it. */
export function trackTutorialAccepted(gameId: string) {
  track(`${gameId}:tutorial-accepted`);
}

/** The tutorial board opened, by whichever of the three routes in. */
export function trackTutorialStarted(gameId: string) {
  track(`${gameId}:tutorial-started`);
}

/** The finish card appeared — the script was played to the end. */
export function trackTutorialFinished(gameId: string) {
  track(`${gameId}:tutorial-finished`);
}

// --- Friction -------------------------------------------------------
//
// What a solve rate cannot tell you: whether a day was solved comfortably
// or fought for. A day whose hints spike is a day that was too hard, and
// the coach sheet opening mid-play means the rules did not land.

export function trackHint(gameId: string) {
  track(`${gameId}:hint`);
}

/** An archived day was reset to be played again. */
export function trackReplay(gameId: string) {
  track(`${gameId}:replay`);
}

/** The how-to-play sheet was opened from the "?" button. */
export function trackCoach(gameId: string) {
  track(`${gameId}:coach`);
}

/** A level was given up on (Polygram's hold-to-skip). */
export function trackSkipLevel(gameId: string) {
  track(`${gameId}:skip-level`);
}

// --- Display settings -----------------------------------------------

/** The settings a player can change, and the shape of their values. */
export type SettingEvent =
  | { key: "theme"; value: "system" | "light" | "dark" }
  | { key: "text"; value: "small" | "default" | "large" | "huge" }
  | { key: "font"; value: "default" | "accessible" };

/**
 * A display setting was changed — app-level, so no game prefix.
 *
 * Fires on the CHANGE, not on the value held, so these count decisions
 * rather than players: someone who tries Huge and goes back to Default
 * shows up in both. Uptake of a setting is better read as its share of
 * changes than as a population.
 */
export function trackSetting({ key, value }: SettingEvent) {
  track(`setting:${key}:${value}`);
}

// --- What the stats work and the score cut added --------------------

/**
 * The stats page's per-day readout was used at least once this visit.
 *
 * Fires ONCE per mount, not per tap. The question is whether anyone reads
 * a single day out of the charts at all — a per-tap count would answer a
 * different question badly, since one curious player scrubbing a line
 * would outweigh fifty who tapped once. The page itself is a pageview
 * already (`data-spa="auto"`), so this is the part a pageview can't see.
 */
export function trackStatsDay(gameId: string) {
  track(`${gameId}:stats-day`);
}

/**
 * A bonus word was found — the tier that used to be worth points.
 *
 * Polygram's score was cut on the premise that players hunt bonus words
 * to complete the board, not to run a total up. This is the count that
 * premise stands or falls on: if the tier goes quiet without points
 * attached to it, the premise was wrong.
 */
export function trackBonusWord(gameId: string) {
  track(`${gameId}:bonus-word`);
}

/**
 * A day was finished with EVERY word on the board found, bonus included.
 *
 * The completionist ceiling, and a deliberately strict one: submitting is
 * closed once the last required word lands, so a full sweep means the
 * player held that word back on purpose. Read it as a rate against
 * `solved`, never as a population.
 *
 * The tutorial never fires this. Its hand-picked puzzle has no bonus tier,
 * so finishing it is a sweep by construction, and counting it would report
 * the ceiling reached every time anyone was taught the game.
 */
export function trackSwept(gameId: string) {
  track(`${gameId}:swept`);
}
