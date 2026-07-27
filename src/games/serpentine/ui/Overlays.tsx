import { Route, Undo2, Grid3X3, CircleHelp, Lightbulb } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { CoachSheet, Key } from "../../../components/CoachSheet";

interface CoachProps {
  open: boolean;
  onClose: () => void;
  /** Route of the tutorial; omitted on the tutorial itself. */
  tutorialTo?: string;
}

export function SerpentineCoach({ open, onClose, tutorialTo }: CoachProps) {
  return (
    <AnimatePresence>
      {open && (
        <CoachSheet
          onClose={onClose}
          tutorialTo={tutorialTo}
          rules={[
            {
              Icon: Route,
              title: "Trace the path",
              body: (
                <>
                  Find a <Key>single continuous path</Key> through the
                  grid. The path snakes through adjacent cells —
                  horizontally, vertically, or <Key>diagonally</Key>. The{" "}
                  <Key>first letter</Key> is placed for you; carry on from
                  there.
                </>
              ),
            },
            {
              Icon: Grid3X3,
              title: "Cover every letter",
              body: (
                <>
                  The puzzle is solved when every letter is on the path.
                  The path <Key>length</Key> is shown below the grid.
                </>
              ),
            },
            {
              Icon: Undo2,
              title: "Tap and drag",
              body: (
                <>
                  <Key>Tap</Key> a cell to extend the path, or{" "}
                  <Key>drag</Key> through cells. Tap a placed cell to
                  undo back to it.
                </>
              ),
            },
            {
              Icon: Lightbulb,
              title: "Use hints",
              body: (
                <>
                  Tap <Key>Hint</Key> to mark the <Key>next cell</Key> of the
                  path on the grid — the one you are stuck on.
                </>
              ),
            },
            {
              Icon: CircleHelp,
              title: "Hidden phrase",
              body: (
                <>
                  The path spells a hidden phrase, and the readout gives{" "}
                  <Key>every word's first letter</Key> — which letter, not
                  where. The poem <Key>title</Key> is your other clue,
                  withheld on the poems named after their own first line.
                </>
              ),
            },
          ]}
        />
      )}
    </AnimatePresence>
  );
}
