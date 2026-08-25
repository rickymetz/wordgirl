import { describe, expect, it } from "vitest";
import { clearance, type ClearanceBoxes } from "./artClearance";

// Art 100px tall beside a title, with 40px of room beneath it in the card.
const boxes = (over: Partial<ClearanceBoxes> = {}): ClearanceBoxes => ({
  titleRight: 200,
  titleBottom: 150,
  artLeft: 260,
  artTop: 120,
  artBottom: 220,
  cardBottom: 260,
  ...over,
});

describe("clearance", () => {
  it("leaves art alone when the title stops short of it", () => {
    // The bands overlap vertically, but the title text ends at 200, well
    // left of the art — side by side, not colliding.
    expect(clearance(boxes())).toEqual({ shift: 0, extraPad: 0 });
  });

  it("leaves art alone when a long title still sits above it", () => {
    expect(clearance(boxes({ titleRight: 300, titleBottom: 110 }))).toEqual({
      shift: 0,
      extraPad: 0,
    });
  });

  it("drops the art past the title, using room the card already has", () => {
    // Overlaps 30px into the art, and there are 40px going spare.
    expect(clearance(boxes({ titleRight: 300 }))).toEqual({
      shift: 30,
      extraPad: 0,
    });
  });

  it("grows the card for the part the room can't cover", () => {
    // Needs 90px with only 40px of room: still shifts the full 90, and asks
    // for the missing 50 as padding rather than leaving the title covered.
    expect(clearance(boxes({ titleRight: 300, titleBottom: 210 }))).toEqual({
      shift: 90,
      extraPad: 50,
    });
  });

  it("grows by the whole shift when the art already fills the card", () => {
    // The tallest previews leave no room at all.
    expect(clearance(boxes({ titleRight: 300, cardBottom: 220 }))).toEqual({
      shift: 30,
      extraPad: 30,
    });
  });

  it("treats an overfull card as no room, never as negative room", () => {
    expect(clearance(boxes({ titleRight: 300, cardBottom: 100 }))).toEqual({
      shift: 30,
      extraPad: 30,
    });
  });
});
