import { Grid2X2, Lightbulb, MousePointerClick, RotateCw, Type } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { CoachSheet, Key } from "../../../components/CoachSheet";

interface CoachProps {
  open: boolean;
  onClose: () => void;
}

export function DoubletCoach({ open, onClose }: CoachProps) {
  return (
    <AnimatePresence>
      {open && (
        <CoachSheet
          onClose={onClose}
          rules={[
            {
              Icon: Grid2X2,
              title: "Place every domino",
              body: (
                <>
                  Fill the board by placing <Key>letter dominoes</Key> from
                  the tray. Each domino covers two adjacent cells.
                </>
              ),
            },
            {
              Icon: Type,
              title: "Spell real words",
              body: (
                <>
                  Every row and column of letters must spell a{" "}
                  <Key>valid word</Key>. The board is solved when all slots
                  are filled correctly.
                </>
              ),
            },
            {
              Icon: MousePointerClick,
              title: "Tap and drag",
              body: (
                <>
                  <Key>Tap</Key> a domino to select it, then tap a cell to
                  place it. Or <Key>drag</Key> dominoes directly onto the
                  board. Tap a placed domino to pick it back up.
                </>
              ),
            },
            {
              Icon: RotateCw,
              title: "Rotate dominoes",
              body: (
                <>
                  Tap the <Key>rotate</Key> button to change a domino's
                  orientation before placing it.
                </>
              ),
            },
            {
              Icon: Lightbulb,
              title: "Hints",
              body: (
                <>
                  Tap <Key>Hint</Key> to place the next domino in its
                  correct position automatically.
                </>
              ),
            },
          ]}
        />
      )}
    </AnimatePresence>
  );
}
