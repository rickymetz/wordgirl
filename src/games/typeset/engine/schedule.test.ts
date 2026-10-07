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

  // Pins history: if this changes, past days moved and archive saves are
  // stranded. Only update it alongside a TYPESET_VERSION bump.
  it("keeps the first week where it is", () => {
    const week = dateKeyRange("2026-10-07", "2026-10-13").map((d) => {
      const c = dailyBoard(d, "charset");
      const f = dailyBoard(d, "faces");
      return `${d} ${c.glyphs.map((g) => g.char).join("")}/${c.glyphs[0].face} ${f.glyphs[0].char}:${f.glyphs.map((g) => g.face).join(",")} ${c.sets.length}+${f.sets.length}`;
    });
    expect(week).toMatchInlineSnapshot(`
      [
        "2026-10-07 ?¶§/eb-garamond f:fraunces,jetbrains-mono,lobster 4+4",
        "2026-10-08 agR/jost &:eb-garamond,archivo-black,kaushan-script 5+4",
        "2026-10-09 &@#/fraunces k:jost,roboto-slab,kaushan-script 4+4",
        "2026-10-10 $£¥/eb-garamond a:bodoni-moda,jost,kaushan-script 6+5",
        "2026-10-11 Qek/fraunces g:eb-garamond,jost,lobster 6+4",
        "2026-10-12 λΩψ/literata f:fraunces,jetbrains-mono,lobster 6+5",
        "2026-10-13 ßÆØ/eb-garamond e:literata,jost,lobster 5+5",
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
