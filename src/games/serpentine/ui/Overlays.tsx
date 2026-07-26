import { Route, Undo2, Grid3X3, CircleHelp, Lightbulb } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { CoachSheet, Key } from "../../../components/CoachSheet";

interface CoachProps {
  open: boolean;
  onClose: () => void;
}

export function SerpentineCoach({ open, onClose }: CoachProps) {
  return (
    <AnimatePresence>
      {open && (
        <CoachSheet
          onClose={onClose}
          rules={[
            {
              Icon: Route,
              title: "Trace the path",
              body: (
                <>
                  Find a <Key>single continuous path</Key> through the
                  grid. The path snakes through adjacent cells —
                  horizontally, vertically, or <Key>diagonally</Key>.
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
                  Tap <Key>Hint</Key> to highlight cells where words begin in
                  the hidden phrase.
                </>
              ),
            },
            {
              Icon: CircleHelp,
              title: "Hidden phrase",
              body: (
                <>
                  The path spells a hidden phrase. The poem{" "}
                  <Key>title</Key> is your clue, withheld on the poems
                  named after their own first line. The phrase is
                  revealed when the puzzle is complete.
                </>
              ),
            },
          ]}
        />
      )}
    </AnimatePresence>
  );
}
