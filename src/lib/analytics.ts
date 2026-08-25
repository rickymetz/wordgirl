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
 * things a pageview cannot see. One catch worth knowing before you touch
 * the CSP in netlify.toml: a pageview is an IMAGE PIXEL and these events
 * are not, so `img-src` and `connect-src` must BOTH allow the Fathom CDN.
 * Drop one and half the dashboard silently reads zero.
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

/**
 * A share was actually SENT (see ShareButton: counted on the result, not
 * the tap — a dismissed native sheet is not a share).
 *
 * `scope` is a game id for a game's own result card, or `"roundup"` for
 * the whole-day card, which belongs to no single game — see the roundup
 * section below.
 */
export function trackShare(scope: string) {
  track(`${scope}:share`);
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

// --- The day's roundup ----------------------------------------------
//
// `roundup:share` is app-level rather than any one game's: it fires from
// BOTH surfaces the whole-day card is offered on — the hub banner and the
// finish outro's "Share the day" pill — and both go through ShareButton
// with the scope "roundup", so the count is shares of the DAY, never of a
// game. Read it against the five per-game `<game>:share` counts to see
// whether finishing everything is worth sharing more than one puzzle was.
//
// It has no denominator yet: nothing counts the banner being SHOWN, so
// this is a raw count, not a rate. If that question comes up, add a
// `roundup:offered` where the banner renders — the same shape as
// `tutorial-offered` and `backup:reminder` — rather than inferring a
// denominator from solve counts, which would miss dismissals.

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

// --- Backing up progress --------------------------------------------
//
// App-level, so no game prefix. The pair answers one question a
// device-local game cannot otherwise ask: whether anybody actually uses
// the escape hatch from "your streak lives on one device". A restore
// count far below the export count is the expected shape — most backups
// are insurance that never gets claimed — but a restore count of zero
// over months would mean the feature is a comfort blanket, not a tool.

/** A backup file was generated and handed to the browser. */
export function trackBackupExport() {
  track("backup:export");
}

/** A backup was accepted and written over local progress. */
export function trackBackupRestore() {
  track("backup:restore");
}

/**
 * The hub offered a backup — the denominator for `backup:export`.
 *
 * Fires where the card is SHOWN, not where it mounts: the component
 * mounts on every hub visit and asks storage whether the offer is due.
 * Only the shown branch is a player actually being asked, which is the
 * same reasoning as `tutorial-offered`.
 */
export function trackBackupReminder() {
  track("backup:reminder");
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
 * A bonus word was found — the rare tier, which is texture rather than a
 * target: unbounded, uncounted against any total, and never asked for.
 *
 * Worth counting precisely because it is optional. If rare words stop
 * landing entirely once nothing rewards them, the tier is decoration
 * nobody sees and the generator should stop paying for it.
 */
export function trackBonusWord(gameId: string) {
  track(`${gameId}:bonus-word`);
}

