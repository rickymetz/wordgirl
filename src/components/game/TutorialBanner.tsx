import { motion } from "motion/react";
import type { TutorialStep } from "../../lib/tutorial/types";

/**
 * Height to reserve for the banner PLUS the gap under it, in px at the
 * default text size — boards add this to their own chrome budget so the
 * instruction never pushes controls below the fold. Rem-scaled by the
 * caller (`* rem / 16`), like every other chrome budget in the app.
 *
 * Step bodies are kept to two lines at the default size for exactly this
 * reason. At the default size the reserve costs nothing, because the
 * boards are capped by their max width well before this bites.
 */
export const TUTORIAL_BANNER_H = 136;

/**
 * The tutorial's running instruction, sat between a game's title and its
 * board: which step we're on, what to do, and why it matters.
 *
 * It is a tinted panel, so anything punched out of it uses `bg-surface`
 * rather than `bg-tile`. The copy is mirrored into an aria-live region
 * (the same idiom GameToast narration uses) because a step advancing is
 * feedback, not decoration.
 */
export function TutorialBanner({
  steps,
  index,
}: {
  steps: TutorialStep[];
  index: number;
}) {
  const done = index >= steps.length;

  // Nothing left to instruct: TutorialDone has taken over the screen and
  // says so itself. Keeping a full tinted band here to read "All steps
  // done" cost a whole line of height at the exact moment the finish card
  // needs it — enough to push "Run it again" off the bottom of a 375x667
  // screen at the Huge text setting.
  if (done) return null;

  const step = steps[index];

  return (
    // The gap under the banner belongs to the banner, not to a wrapper in
    // each GameScreen — otherwise the `return null` above would leave five
    // stray 12px bands behind on the finish screen. TUTORIAL_BANNER_H has
    // always described the banner PLUS this gap.
    <div className="mb-3 rounded-2xl bg-surface-tint px-3.5 py-2.5 [@media(max-height:720px)]:py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold tracking-wide text-accent uppercase">
          {`Step ${index + 1} of ${steps.length}`}
        </span>
        <span aria-hidden className="flex gap-1">
          {steps.map((s, i) => (
            <span
              key={s.title}
              className={[
                "h-1.5 w-1.5 rounded-full transition-colors",
                i < index ? "bg-accent" : "bg-accent/25",
              ].join(" ")}
            />
          ))}
        </span>
      </div>
      <motion.div
        key={step.title}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="pt-0.5"
      >
        <p className="text-sm font-semibold text-ink">{step.title}</p>
        <p className="text-sm leading-tight text-ink-soft">{step.body}</p>
      </motion.div>
      <div aria-live="polite" role="status" className="sr-only">
        {`Step ${index + 1} of ${steps.length}. ${step.title}.`}
      </div>
    </div>
  );
}
