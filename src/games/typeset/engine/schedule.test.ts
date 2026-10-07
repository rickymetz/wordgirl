import { describe, expect, it } from "vitest";
import { dateKeyRange } from "../../../lib/date";
import { CHARSET_POOL, FACES_POOL } from "./pool";
import { dailyBoard, practiceBoard, scheduleSlot } from "./schedule";
import { findSets } from "./sets";

describe("schedule", () => {
  it("plays every charset entry once per cycle", () => {
    const days = dateKeyRange("2026-10-01", "2026-12-31").slice(0, CHARSET_POOL.length);
    const entries = days.map((d) => scheduleSlot(CHARSET_POOL, "charset", d).entry);
    expect(new Set(entries).size).toBe(CHARSET_POOL.length);
  });

  it("plays every faces entry once per cycle", () => {
    const days = dateKeyRange("2026-10-01", "2026-12-31").slice(0, FACES_POOL.length);
    const entries = days.map((d) => scheduleSlot(FACES_POOL, "faces", d).entry);
    expect(new Set(entries).size).toBe(FACES_POOL.length);
  });

  it("never replays an entry within three days across a cycle boundary", () => {
    const days = dateKeyRange("2026-10-01", "2027-09-30");
    for (const [pool, kind] of [[CHARSET_POOL, "charset"], [FACES_POOL, "faces"]] as const) {
      const seq = days.map((d) => scheduleSlot<(typeof pool)[number]>(pool, kind, d).entry);
      for (let i = 0; i < seq.length; i++)
        for (let j = i + 1; j < Math.min(seq.length, i + 4); j++) expect(seq[j], `${kind} ${days[i]}→${days[j]}`).not.toBe(seq[i]);
    }
  });

  // Pins history: if a DEAL or an entry's position changes, past days moved
  // and archive saves are stranded (only alongside a TYPESET_VERSION bump).
  // A glyph changing here is an entry fixed in place (see pool.ts): 10-07,
  // 10-09 and 10-11 were re-set on launch day by legibility.test.ts.
  it("keeps the first week where it is", () => {
    const week = dateKeyRange("2026-10-07", "2026-10-13").map((d) => {
      const c = dailyBoard(d, "charset");
      const f = dailyBoard(d, "faces");
      return `${d} ${c.glyphs.map((g) => g.char).join("")}/${c.glyphs[0].face} ${f.glyphs[0].char}:${f.glyphs.map((g) => g.face).join(",")} ${c.sets.length}+${f.sets.length}`;
    });
    expect(week).toMatchInlineSnapshot(`
      [
        "2026-10-07 &@?/fraunces e:bodoni-moda,jost,lobster 4+4",
        "2026-10-08 agR/jost R:bodoni-moda,archivo-black,roboto-slab 5+4",
        "2026-10-09 αγξ/literata d:eb-garamond,archivo-black,lobster 4+5",
        "2026-10-10 Ags/archivo-black a:bodoni-moda,jost,kaushan-script 6+4",
        "2026-10-11 £₹₩/literata &:eb-garamond,archivo-black,lobster 6+4",
        "2026-10-12 ßÆØ/eb-garamond k:jost,roboto-slab,kaushan-script 6+4",
        "2026-10-13 ₽£$/jost g:eb-garamond,jost,lobster 5+4",
      ]
    `);
  });

  it("deals every board of the first quarter in range, deterministically", () => {
    for (const d of dateKeyRange("2026-10-01", "2026-12-31")) {
      for (const kind of ["charset", "faces"] as const) {
        const b = dailyBoard(d, kind);
        expect(b.sets).toEqual(findSets(b.cards));
        expect(b.sets.length).toBeGreaterThanOrEqual(4);
        expect(b.sets.length).toBeLessThanOrEqual(8);
        expect(dailyBoard(d, kind)).toEqual(b);
      }
    }
  });

  it("gives the two boards of a day different deals", () => {
    const c = dailyBoard("2026-10-07", "charset");
    const f = dailyBoard("2026-10-07", "faces");
    expect(c.cards).not.toEqual(f.cards);
  });

  it("builds practice boards of either kind", () => {
    expect(practiceBoard("charset", "abc").kind).toBe("charset");
    expect(practiceBoard("faces", "abc").label).toBe("Faces");
  });
});
