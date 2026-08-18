import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  trackArchivePlay,
  trackCoach,
  trackHint,
  trackPractice,
  trackReplay,
  trackSetting,
  trackShare,
  trackSkipLevel,
  trackSolved,
  trackStarted,
  trackTutorialAccepted,
  trackTutorialFinished,
  trackTutorialOffered,
  trackTutorialStarted,
} from "./analytics";

let sent: string[];

beforeEach(() => {
  sent = [];
  window.fathom = { trackEvent: (name: string) => sent.push(name) };
});

afterEach(() => {
  delete window.fathom;
});

describe("game events", () => {
  it("prefix every event with the game, so the dashboard groups by game", () => {
    trackStarted("serpentine");
    trackSolved("serpentine");
    trackShare("serpentine");
    trackPractice("serpentine");
    trackArchivePlay("serpentine");
    trackHint("serpentine");
    trackReplay("serpentine");
    trackCoach("serpentine");
    trackSkipLevel("polygram");
    expect(sent).toEqual([
      "serpentine:started",
      "serpentine:solved",
      "serpentine:share",
      "serpentine:practice",
      "serpentine:archive",
      "serpentine:hint",
      "serpentine:replay",
      "serpentine:coach",
      "polygram:skip-level",
    ]);
  });

  it("names the tutorial funnel in the order it is walked", () => {
    trackTutorialOffered("doublet");
    trackTutorialAccepted("doublet");
    trackTutorialStarted("doublet");
    trackTutorialFinished("doublet");
    expect(sent).toEqual([
      "doublet:tutorial-offered",
      "doublet:tutorial-accepted",
      "doublet:tutorial-started",
      "doublet:tutorial-finished",
    ]);
  });
});

describe("setting events", () => {
  it("carry no game prefix — one choice, not five", () => {
    trackSetting({ key: "font", value: "accessible" });
    trackSetting({ key: "theme", value: "dark" });
    trackSetting({ key: "text", value: "huge" });
    expect(sent).toEqual([
      "setting:font:accessible",
      "setting:theme:dark",
      "setting:text:huge",
    ]);
    expect(sent.every((e) => !e.includes("serpentine"))).toBe(true);
  });
});

describe("when Fathom is not there", () => {
  it("drops the event instead of throwing", () => {
    // The app plays offline, where the script never loaded. Every one of
    // these runs during ordinary play — a throw here would break the game
    // over a statistic.
    delete window.fathom;
    expect(() => {
      trackSolved("crosshatch");
      trackHint("crosshatch");
      trackTutorialFinished("crosshatch");
      trackSetting({ key: "font", value: "default" });
    }).not.toThrow();
  });

  it("does not send anything a person could be recognised by", () => {
    // Fathom is the cookieless choice; keep the payload a bare name.
    trackSolved("pierglass");
    trackSetting({ key: "theme", value: "light" });
    for (const event of sent) {
      expect(event).toMatch(/^[a-z-]+:[a-z-]+(:[a-z-]+)?$/);
    }
  });
});
