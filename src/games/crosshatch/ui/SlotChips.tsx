import { remainingInSlot } from "../engine/scoring";
import type { Slot } from "../engine/types";
import { cellKey, slotCells } from "../engine/types";
import {
  cursorSlot,
  letterAt,
  slotWord,
  type GameState,
} from "../state/reducer";

/**
 * The deduction aid, always visible: one chip per line showing its
 * current content and how many words the line can still yield. Zero
 * means the line is exhausted — leave a valid word there and hunt
 * elsewhere. A chip's word lights up when it would bank a NEW word.
 * Tapping a chip aims the cursor at its line.
 */
export function SlotChips({
  state,
  onFocusSlot,
}: {
  state: GameState;
  onFocusSlot: (slot: Slot) => void;
}) {
  const { puzzle } = state;
  const found = new Set(state.found);
  const active = cursorSlot(state);

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {puzzle.shape.slots.map((slot, i) => {
        // A fully-given line has nothing to type or aim at — no chip.
        // (The generator avoids these, but old/practice seeds may not.)
        if (
          slotCells(slot).every((c) => puzzle.givens[cellKey(c.row, c.col)])
        ) {
          return null;
        }
        const { word, complete } = slotWord(state, slot);
        const display = slotCells(slot)
          .map((c) => letterAt(state, c.row, c.col)?.toUpperCase() ?? "·")
          .join("");
        const count = remainingInSlot(puzzle, found, i);
        // This line currently holds an uncredited word: submit-worthy.
        const isNew =
          complete &&
          !found.has(word) &&
          puzzle.combos.some((c) => c[i] === word);
        const arrow = slot.dir === "across" ? "→" : "↓";
        return (
          <button
            key={i}
            type="button"
            onClick={() => onFocusSlot(slot)}
            aria-label={`${slot.dir} word ${display} — ${count} ${
              count === 1 ? "word" : "words"
            } left in this line`}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
              active === slot ? "border-accent" : "border-line"
            }`}
          >
            <span aria-hidden className="text-xs text-ink-soft">
              {arrow}
            </span>
            <span
              className={`tracking-wide ${isNew ? "text-accent" : ""}`}
            >
              {display}
            </span>
            {/* Zero is the load-bearing signal — this line has no
                words left to give, so it gets the warning color. */}
            <span
              className={`font-game text-xs ${
                count > 0 ? "text-accent" : "text-warn"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
