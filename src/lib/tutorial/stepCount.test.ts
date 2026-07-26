import { describe, expect, it } from "vitest";

import * as polygramEngine from "../../games/polygram/engine/tutorial";
import * as crosshatchEngine from "../../games/crosshatch/engine/tutorial";
import * as backwordsEngine from "../../games/backwords/engine/tutorial";
import * as doubletEngine from "../../games/doublet/engine/tutorial";
import * as serpentineEngine from "../../games/serpentine/engine/tutorial";

import { TUTORIAL_STEPS as polygramSteps } from "../../games/polygram/ui/tutorialSteps";
import { TUTORIAL_STEPS as crosshatchSteps } from "../../games/crosshatch/ui/tutorialSteps";
import { TUTORIAL_STEPS as backwordsSteps } from "../../games/backwords/ui/tutorialSteps";
import { TUTORIAL_STEPS as doubletSteps } from "../../games/doublet/ui/tutorialSteps";
import { TUTORIAL_STEPS as serpentineSteps } from "../../games/serpentine/ui/tutorialSteps";

/**
 * Each game states how many steps it has TWICE: `TUTORIAL_STEP_COUNT` in
 * engine/ (which `tutorialStepIndex` returns to mean "finished", and which
 * must stay React-free) and the `TUTORIAL_STEPS` array in ui/ (the copy).
 *
 * Nothing in the type system ties them together, so deleting a step from
 * the copy would leave the banner reading "Step 4 of 3" and the finish card
 * never arriving. This is the seam that catches that.
 */
const GAMES = [
  { name: "polygram", count: polygramEngine.TUTORIAL_STEP_COUNT, steps: polygramSteps },
  { name: "crosshatch", count: crosshatchEngine.TUTORIAL_STEP_COUNT, steps: crosshatchSteps },
  { name: "backwords", count: backwordsEngine.TUTORIAL_STEP_COUNT, steps: backwordsSteps },
  { name: "doublet", count: doubletEngine.TUTORIAL_STEP_COUNT, steps: doubletSteps },
  { name: "serpentine", count: serpentineEngine.TUTORIAL_STEP_COUNT, steps: serpentineSteps },
];

describe("every game's tutorial", () => {
  it.each(GAMES)("$name: engine step count matches the copy", ({ count, steps }) => {
    expect(steps).toHaveLength(count);
  });

  it.each(GAMES)("$name: every step has a title and a body", ({ steps }) => {
    for (const step of steps) {
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.body).toBeTruthy();
    }
  });

  it.each(GAMES)("$name: step titles are unique", ({ steps }) => {
    // TutorialBanner keys its progress dots by title, so a duplicate would
    // collide two React keys and drop a dot.
    expect(new Set(steps.map((s) => s.title)).size).toBe(steps.length);
  });

  it("covers all five games", () => {
    expect(GAMES).toHaveLength(5);
  });
});
