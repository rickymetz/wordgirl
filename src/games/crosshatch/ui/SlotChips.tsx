import { remainingWithWord } from "../engine/scoring";
import type { Slot } from "../engine/types";
import { slotCells } from "../engine/types";
import {
  cursorSlot,
  foundKeySet,
  letterAt,
  slotWord,
  type GameState,
} from "../state/reducer";

/**
 * The deduction aid, always visible: one chip per line showing its
 * current word and how many UNFOUND combos still use that word there.
 * Zero means the word is exhausted — change that line. Tapping a chip
 * aims the cursor at its line.
 */
export function SlotChips({
  state,
  onFocusSlot,
}: {
  state: GameState;
  onFocusSlot: (slot: Slot) => void;
}) {
  const { puzzle } = state;
  const foundKeys = foundKeySet(state.found);
  const active = cursorSlot(state);

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {puzzle.shape.slots.map((slot, i) => {
        const { word, complete } = slotWord(state, slot);
        const display = slotCells(slot)
          .map((c) => letterAt(state, c.row, c.col)?.toUpperCase() ?? "·")
          .join("");
        const count = complete
          ? remainingWithWord(puzzle, foundKeys, i, word)
          : null;
        const arrow = slot.dir === "across" ? "→" : "↓";
        return (
          <button
            key={i}
            type="button"
            onClick={() => onFocusSlot(slot)}
            aria-label={`${slot.dir} word ${display}${
              count !== null ? ` — ${count} combos left with it` : ""
            }`}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
              active === slot ? "border-accent" : "border-line"
            }`}
          >
            <span aria-hidden className="text-xs text-ink-soft">
              {arrow}
            </span>
            <span className="tracking-wide">{display}</span>
            {count !== null && (
              // Zero is the load-bearing signal — no unfound combo uses
              // this word here, so it gets the warning color.
              <span
                className={`font-game text-xs ${
                  count > 0 ? "text-accent" : "text-warn"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
