import { Check, CircleCheck, MoveDown, MoveRight, X } from "lucide-react";
import type { Slot } from "../engine/types";
import { cellKey, slotCells } from "../engine/types";
import {
  cursorSlot,
  letterAt,
  slotWord,
  type GameState,
} from "../state/reducer";

/**
 * One chip per line showing its current content plus a verdict icon:
 * an X when the word doesn't work there, a grey check when it's
 * counted already (a normal state — winning grids reuse found words),
 * a green circled check for a new word. Tapping a chip aims the
 * cursor at its line.
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
        // Reusing found words is NORMAL (most winning grids do), so
        // that state is a calm grey check — not a warning.
        const verdict = !complete
          ? null
          : !puzzle.combos.some((c) => c[i] === word)
            ? { Icon: X, tone: "text-warn", label: "doesn't work here" }
            : found.has(word)
              ? { Icon: Check, tone: "text-ink-soft", label: "counted already" }
              : { Icon: CircleCheck, tone: "text-good", label: "new word" };
        const Arrow = slot.dir === "across" ? MoveRight : MoveDown;
        return (
          <button
            key={i}
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => onFocusSlot(slot)}
            aria-label={`${slot.dir} word ${display}${
              verdict ? ` — ${verdict.label}` : ""
            }`}
            className={`flex touch-manipulation items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors select-none ${
              active === slot ? "border-accent" : "border-line"
            }`}
          >
            <Arrow aria-hidden className="h-3 w-3 text-ink-soft" strokeWidth={3} />
            <span className="tracking-wide">{display}</span>
            {verdict && (
              <verdict.Icon
                aria-hidden
                className={`h-4 w-4 ${verdict.tone}`}
                strokeWidth={3}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
