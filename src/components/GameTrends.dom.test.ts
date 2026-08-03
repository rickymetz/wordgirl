import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { GameTrends, type GameTrendsConfig } from "./GameTrends";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

interface Day {
  dateKey: string;
  time: number;
  /** Absent on the day the second metric has nothing for. */
  words?: number;
  hour?: number;
}

/** Three consecutive days ending today, so they sit inside the window. */
function recentDates(): string[] {
  const t = new Date();
  return [2, 1, 0].map((back) => {
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - back);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}

const DATES = recentDates();

const config: GameTrendsConfig<Day> = {
  gameId: "test",
  accent: "neutral",
  // Well before the window, so `from` ends on today and holds all three.
  epoch: "2020-01-01",
  loadAllDays: async () =>
    Object.fromEntries([
      [DATES[0], { dateKey: DATES[0], time: 100, words: 5, hour: 9 }],
      [DATES[1], { dateKey: DATES[1], time: 200, words: 7, hour: 21 }],
      // The middle metric has nothing here — the shared pick must still
      // say the date rather than quietly falling back to its summary.
      [DATES[2], { dateKey: DATES[2], time: 300 }],
    ]),
  metrics: [
    { key: "time", label: "Time", value: (d) => d.time },
    { key: "words", label: "Words", value: (d) => d.words ?? null },
  ],
  hours: { label: "When", value: (d) => d.hour ?? null },
};

// GameTrends links to the archive, so it needs a router around it.
const render = async () => {
  await act(async () => {
    root.render(
      createElement(MemoryRouter, null, createElement(GameTrends<Day>, { config })),
    );
  });
};

const charts = () => [...container.querySelectorAll<SVGSVGElement>("svg[role=img]")];
/** Each chart's readout line. */
const readouts = () =>
  [...container.querySelectorAll("section")].map(
    (s) => s.querySelector("p")?.textContent ?? "",
  );

function press(chart: SVGSVGElement, key: string) {
  act(() => {
    chart.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

describe("picking a day reads it on every chart", () => {
  it("starts with each chart showing its own summary", async () => {
    await render();
    const [time, words, hours] = readouts();
    expect(time).toBe("Best 300 · Avg 200");
    expect(words).toBe("Best 7 · Avg 6");
    expect(hours).toMatch(/^Most often /);
  });

  it("moves both charts to the same day from one chart's keys", async () => {
    // The point of the change: a player asks about a DAY, and should not
    // have to find that day again on every other line by hand.
    await render();
    press(charts()[0], "Home"); // oldest day, on the Time chart
    const [time, words] = readouts();
    expect(time).toMatch(/· 100$/);
    expect(words).toMatch(/· 5$/);
    // ...and both name the same date.
    expect(time.split(" · ")[0]).toBe(words.split(" · ")[0]);
  });

  it("says the date with a dash where a chart has no value for it", async () => {
    await render();
    press(charts()[0], "End"); // today: Time has 300, Words has nothing
    const [time, words] = readouts();
    expect(time).toMatch(/· 300$/);
    expect(words).toMatch(/· —$/);
    expect(words.split(" · ")[0]).toBe(time.split(" · ")[0]);
  });

  it("clears from either chart, putting every summary back", async () => {
    await render();
    press(charts()[0], "Home");
    expect(readouts()[0]).toMatch(/· 100$/);
    press(charts()[1], "Escape"); // cleared from the OTHER chart
    const [time, words, hours] = readouts();
    expect(time).toBe("Best 300 · Avg 200");
    expect(words).toBe("Best 7 · Avg 6");
    expect(hours).toMatch(/^Most often /);
  });

  it("moves the hour histogram to that day's hour too", async () => {
    // It is indexed by hour, not date, so it cannot show the day — it
    // shows where that day sits on this axis, which is the same question.
    await render();
    press(charts()[0], "Home");
    expect(readouts()[2]).toMatch(/· 9am$/);
    press(charts()[0], "ArrowRight");
    expect(readouts()[2]).toMatch(/· 9pm$/);
  });

  it("tells a screen reader which day it is now reading", async () => {
    await render();
    press(charts()[0], "Home");
    expect(charts()[0].getAttribute("aria-label")).toMatch(/Time: .*, 100\./);
    expect(charts()[1].getAttribute("aria-label")).toMatch(/Words: .*, 5\./);
    press(charts()[0], "End");
    expect(charts()[1].getAttribute("aria-label")).toMatch(/nothing recorded/);
  });
});
