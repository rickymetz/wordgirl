import { describe, expect, it } from "vitest";
import { HARD_SHAPES, SHAPES } from "./shapes";
import { cellKey, slotCells } from "./types";

/** Both libraries obey the shared rules; the hard one adds its own. */
const LIBRARIES = [
  { name: "normal", shapes: SHAPES },
  { name: "hard", shapes: HARD_SHAPES },
];
const ALL = LIBRARIES.flatMap((l) => l.shapes);

describe.each(LIBRARIES)("shape library: $name", ({ shapes: SHAPES }) => {
  it("every shape: 3-5 slots of len 3-5, inside a 5x5 grid", () => {
    for (const shape of SHAPES) {
      expect(shape.slots.length).toBeGreaterThanOrEqual(3);
      expect(shape.slots.length).toBeLessThanOrEqual(5);
      for (const slot of shape.slots) {
        expect(slot.len).toBeGreaterThanOrEqual(3);
        expect(slot.len).toBeLessThanOrEqual(5);
        for (const c of slotCells(slot)) {
          expect(c.row).toBeGreaterThanOrEqual(0);
          expect(c.col).toBeGreaterThanOrEqual(0);
          expect(c.row).toBeLessThan(5);
          expect(c.col).toBeLessThan(5);
        }
      }
    }
  });

  it("every slot intersects at least one other slot", () => {
    for (const shape of SHAPES) {
      const cellSets = shape.slots.map(
        (s) => new Set(slotCells(s).map((c) => cellKey(c.row, c.col))),
      );
      for (let i = 0; i < cellSets.length; i++) {
        const intersects = cellSets.some(
          (other, j) =>
            j !== i && [...cellSets[i]].some((k) => other.has(k)),
        );
        expect(intersects, `${shape.id} slot ${i} is disconnected`).toBe(true);
      }
    }
  });

  it("same-direction slots never overlap; crossing slots share ≤1 cell", () => {
    for (const shape of SHAPES) {
      for (let i = 0; i < shape.slots.length; i++) {
        for (let j = i + 1; j < shape.slots.length; j++) {
          const a = shape.slots[i];
          const b = shape.slots[j];
          const shared = slotCells(a).filter((ca) =>
            slotCells(b).some((cb) => ca.row === cb.row && ca.col === cb.col),
          );
          if (a.dir === b.dir) {
            expect(shared, `${shape.id}: parallel slots overlap`).toHaveLength(
              0,
            );
          } else {
            expect(shared.length, `${shape.id}: crossing overlap`).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it("shape ids are unique (seeds pick by index, names by id)", () => {
    expect(new Set(SHAPES.map((s) => s.id)).size).toBe(SHAPES.length);
  });
});

describe("the hard library", () => {
  it("runs every line at five letters", () => {
    // The whole point of the board: longer lines showing a smaller
    // share of themselves. A shorter line here would be an easy one.
    for (const shape of HARD_SHAPES) {
      for (const slot of shape.slots) {
        expect(slot.len, `${shape.id} has a ${slot.len}-letter line`).toBe(5);
      }
    }
  });

  it("crosses more than the normal library does", () => {
    for (const shape of HARD_SHAPES) {
      expect(shape.slots.length, shape.id).toBeGreaterThanOrEqual(4);
    }
  });

  it("shares no id with the normal library", () => {
    expect(new Set(ALL.map((s) => s.id)).size).toBe(ALL.length);
  });
});
