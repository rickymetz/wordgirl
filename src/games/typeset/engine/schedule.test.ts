import { describe, expect, it } from "vitest";
import { dateKeyRange } from "../../../lib/date";
import { CHARSET_POOL, FACES_POOL, NEVER_DEALT } from "./pool";
import { dailyBoard, practiceBoard, scheduleSlot } from "./schedule";
import { findSets } from "./sets";

describe("schedule", () => {
  // Each of the first few cycles plays exactly the entries live in it:
  // added from `since`, retired from `until`.
  for (const [pool, kind] of [[CHARSET_POOL, "charset"], [FACES_POOL, "faces"]] as const) {
    it(`plays every live ${kind} entry once per cycle`, () => {
      const byCycle = new Map<number, unknown[]>();
      for (const d of dateKeyRange("2026-10-01", "2027-03-31")) {
        const { entry, cycle } = scheduleSlot<(typeof pool)[number]>(pool, kind, d);
        byCycle.set(cycle, [...(byCycle.get(cycle) ?? []), entry]);
      }
      const last = Math.max(...byCycle.keys());
      for (const [cycle, played] of byCycle) {
        if (cycle === last) continue; // cut off by the date range
        const live = pool.filter((e) => e.since <= cycle && (e.until === undefined || cycle < e.until));
        expect(played, `${kind} cycle ${cycle}`).toHaveLength(live.length);
        expect(new Set(played), `${kind} cycle ${cycle}`).toEqual(new Set(live));
      }
    });
  }

  // The first faces "k" played 10-01 and the second 10-12, before the rule
  // (pool.ts NEVER_DEALT); from the day after, no board may deal one.
  it("never deals a character a card may not repeat, from 2026-10-13 on", () => {
    const dealt: string[] = [];
    for (const d of dateKeyRange("2026-10-13", "2028-12-31"))
      for (const kind of ["charset", "faces"] as const)
        for (const g of dailyBoard(d, kind).glyphs) if (NEVER_DEALT.has(g.char)) dealt.push(`${d} ${kind} ${g.char}`);
    expect(dealt).toEqual([]);
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

  it("never deals a retired entry in practice", () => {
    for (let i = 0; i < 500; i++)
      for (const kind of ["charset", "faces"] as const)
        for (const g of practiceBoard(kind, `seed${i}`).glyphs) expect(NEVER_DEALT.has(g.char), `${kind} seed${i}`).toBe(false);
  });

  it("builds practice boards of either kind", () => {
    expect(practiceBoard("charset", "abc").kind).toBe("charset");
    expect(practiceBoard("faces", "abc").label).toBe("Faces");
  });
});
