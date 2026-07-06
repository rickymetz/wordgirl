import type { Slot } from "../engine/types";
import { cellKey, slotCells } from "../engine/types";
import {
  cursorSlot,
  letterAt,
  slotWord,
  type GameState,
} from "../state/reducer";

/**
 * One chip per line showing its current content plus an emoji verdict:
 * ❌ the word doesn't work there, ⚠️ it's already banked, ✅ it's a
 * new word ready to submit. Tapping a chip aims the cursor at its line.
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
        const verdict = !complete
          ? null
          : !puzzle.combos.some((c) => c[i] === word)
            ? { emoji: "❌", label: "doesn't work here" }
            : found.has(word)
              ? { emoji: "⚠️", label: "already banked" }
              : { emoji: "✅", label: "new word" };
        const arrow = slot.dir === "across" ? "→" : "↓";
        return (
          <button
            key={i}
            type="button"
            onClick={() => onFocusSlot(slot)}
            aria-label={`${slot.dir} word ${display}${
              verdict ? ` — ${verdict.label}` : ""
            }`}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
              active === slot ? "border-accent" : "border-line"
            }`}
          >
            <span aria-hidden className="text-xs text-ink-soft">
              {arrow}
            </span>
            <span className="tracking-wide">{display}</span>
            {verdict && (
              <span aria-hidden className="text-xs">
                {verdict.emoji}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
