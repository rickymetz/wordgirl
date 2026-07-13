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

export function trackArchivePlay(gameId: string) {
  track(`${gameId}:archive`);
}
