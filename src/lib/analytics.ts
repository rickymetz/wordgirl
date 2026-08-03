declare global {
  interface Window {
    fathom?: { trackEvent: (name: string) => void };
  }
}

function track(event: string) {
  window.fathom?.trackEvent(event);
}

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
