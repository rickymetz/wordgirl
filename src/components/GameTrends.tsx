import { useEffect, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { HomeLink } from "./HomeLink";
import { dateKeyRange, localDateKey } from "../lib/date";

/**
 * The stats-over-time page every game gets from a config (GameArchive's
 * sibling). Tufte rules the drawing: each metric is a word-sized
 * SPARKLINE in the game's accent — data is the darkest ink, the only
 * scaffold is a range-frame that spans exactly the played days, and
 * the extremes are labeled directly instead of implying an axis. One
 * hue per chart (the four game accents fail as a categorical SET —
 * validated — so cross-game comparisons are deliberately not a
 * thing); values on tap.
 */
export interface TrendMetric<Day> {
  key: string;
  label: string;
  /** The day's value, or null when the day doesn't count (unsolved). */
  value: (day: Day) => number | null;
  /** Defaults to one-decimal rounding. */
  format?: (v: number) => string;
  /** Lower is better (solve time) — picks which extreme "Best" shows. */
  lowerIsBetter?: boolean;
}

/**
 * The common counter metric: charts only SOLVED days, and a legacy
 * save without the field charts as a GAP (null) — never a fake zero,
 * which would read as a best-ever day on a lower-is-better chart.
 */
export function solvedCounter<
  Day extends { dateKey: string; solved: boolean },
>(
  key: string,
  label: string,
  field: (day: Day) => number | undefined,
  opts?: { lowerIsBetter?: boolean },
): TrendMetric<Day> {
  return {
    key,
    label,
    value: (d) => {
      const v = field(d);
      return d.solved && v !== undefined ? v : null;
    },
    lowerIsBetter: opts?.lowerIsBetter,
  };
}

export interface GameTrendsConfig<Day extends { dateKey: string }> {
  gameId: string;
  accent: string | number;
  epoch: string;
  loadAllDays: () => Promise<Record<string, Day>>;
  metrics: TrendMetric<Day>[];
  /** Optional hour-of-day distribution (a histogram, not a sparkline):
   * value returns the local hour 0-23 a day was solved, or null. */
  hours?: { label: string; value: (day: Day) => number | null };
}

const WINDOW_DAYS = 30;

const defaultFormat = (v: number) => `${Math.round(v * 10) / 10}`;

export function GameTrends<Day extends { dateKey: string }>({
  config,
}: {
  config: GameTrendsConfig<Day>;
}) {
  const [days, setDays] = useState<Record<string, Day> | null>(null);
  useEffect(() => {
    void config.loadAllDays().then(setDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.gameId]);

  const today = localDateKey();
  const from = dateKeyRange(config.epoch, today).slice(-WINDOW_DAYS);

  return (
    <div
      data-level={config.accent}
      className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-12 md:max-w-2xl"
    >
      <header className="flex items-center justify-between pt-6 pb-2">
        <HomeLink />
        <Link
          to={`/games/${config.gameId}/archive`}
          className="text-sm font-semibold text-accent"
        >
          Archive
        </Link>
      </header>
      <div className="pb-5">
        <h1 className="text-2xl font-bold tracking-tight">Stats</h1>
        <p className="pt-1 text-sm text-ink-soft">Last {WINDOW_DAYS} days</p>
      </div>

      {days && (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8">
          {config.metrics.map((m) => (
            <MetricChart key={m.key} metric={m} days={days} dates={from} />
          ))}
        </div>
      )}
      {days && config.hours && (
        <HourChart metric={config.hours} days={days} dates={from} />
      )}
      {days &&
        config.metrics.every(
          (m) =>
            from.filter((d) => days[d] && m.value(days[d]) !== null).length <
            2,
        ) && (
          <p className="pt-2 text-sm text-ink-soft">
            Play a few days and the trends fill in.
          </p>
        )}
    </div>
  );
}

/** Marks are far smaller than a fingertip, so a tap anywhere on a
 * chart picks the candidate whose x position is nearest the pointer. */
function nearestAt(
  e: PointerEvent<SVGSVGElement>,
  W: number,
  x: (i: number) => number,
  candidates: number[],
): number {
  const rect = e.currentTarget.getBoundingClientRect();
  const vx = ((e.clientX - rect.left) / rect.width) * W;
  return candidates.reduce((a, b) =>
    Math.abs(x(b) - vx) < Math.abs(x(a) - vx) ? b : a,
  );
}

function MetricChart<Day extends { dateKey: string }>({
  metric,
  days,
  dates,
}: {
  metric: TrendMetric<Day>;
  days: Record<string, Day>;
  dates: string[];
}) {
  // The picked day is remembered by DATE, not index — indices shift
  // when the window slides past midnight, and a stale date simply
  // stops matching instead of silently denoting a different day.
  const [picked, setPicked] = useState<string | null>(null);
  const fmt = metric.format ?? defaultFormat;
  const points = dates.map((dateKey) => {
    const day = days[dateKey];
    const v = day ? metric.value(day) : null;
    return { dateKey, v };
  });
  const values = points.flatMap((p) => (p.v === null ? [] : [p.v]));
  if (values.length === 0) return null;

  const maxV = Math.max(...values);
  const minV = Math.min(...values);
  const best = metric.lowerIsBetter ? minV : maxV;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // The drawing fills its container: trim the window's EMPTY edges
  // (days before the first play / after the last) and stretch what
  // remains across the full width. Interior gaps stay — a skipped
  // day is data; unplayed margin is not.
  let firstI = 0;
  while (points[firstI].v === null) firstI++;
  let lastI = points.length - 1;
  while (points[lastI].v === null) lastI--;
  const drawn = points.slice(firstI, lastI + 1);
  // Played days, as indices into drawn. Trimming guarantees the first
  // and last entries are played, so the latest is dataIdx's tail and
  // every drawn[dataIdx[i]].v is non-null.
  const dataIdx = drawn.flatMap((p, i) => (p.v === null ? [] : [i]));
  const latest = dataIdx[dataIdx.length - 1];
  const pickedIdx = dataIdx.find((i) => drawn[i].dateKey === picked) ?? null;
  const pickedPoint = pickedIdx === null ? null : drawn[pickedIdx];

  // Sparkline geometry, sized for a HALF-width grid cell: dots on
  // played days, thin segments joining CONSECUTIVE days only,
  // headroom above and below for the direct min/max labels.
  const W = 168;
  const H = 64;
  const TOP = 14;
  const BOTTOM = 14;
  const PAD = 8; // keeps edge dots and rings inside the viewBox
  const x = (i: number) =>
    drawn.length === 1
      ? W / 2
      : PAD + (i * (W - PAD * 2)) / (drawn.length - 1);
  const y = (v: number) =>
    maxV === minV
      ? TOP + (H - TOP - BOTTOM) / 2
      : TOP + ((maxV - v) / (maxV - minV)) * (H - TOP - BOTTOM);

  const segments: string[] = [];
  for (let i = 1; i < drawn.length; i++) {
    const a = drawn[i - 1].v;
    const b = drawn[i].v;
    if (a !== null && b !== null) {
      segments.push(`M${x(i - 1)},${y(a)} L${x(i)},${y(b)}`);
    }
  }
  const maxIdx = dataIdx.find((i) => drawn[i].v === maxV)!;
  const minIdx = dataIdx.find((i) => drawn[i].v === minV)!;
  // Keep edge labels inside the frame.
  const anchor = (i: number) =>
    x(i) < 26 ? "start" : x(i) > W - 26 ? "end" : "middle";

  const pickNearest = (e: PointerEvent<SVGSVGElement>) => {
    const key = drawn[nearestAt(e, W, x, dataIdx)].dateKey;
    setPicked((cur) => (cur === key ? null : key));
  };

  return (
    <section className="flex min-w-0 flex-col">
      <h2 className="text-sm leading-tight font-bold">{metric.label}</h2>
      <p className="pt-0.5 text-xs text-ink-soft">
        {pickedPoint
          ? `${shortDate(pickedPoint.dateKey)} · ${fmt(pickedPoint.v!)}`
          : `Best ${fmt(best)} · Avg ${fmt(avg)}`}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H + 8}`}
        className="mt-auto w-full touch-manipulation select-none"
        role="img"
        aria-label={`${metric.label}, last ${dates.length} days. Best ${fmt(best)}, average ${fmt(avg)}, latest ${fmt(drawn[latest].v!)}.`}
        onPointerDown={pickNearest}
      >
        {/* Range-frame: the only scaffold, spanning exactly the
            played days. */}
        <line
          x1={x(dataIdx[0])}
          x2={x(latest)}
          y1={H}
          y2={H}
          className="stroke-line"
          strokeWidth={1}
        />
        {segments.map((d, i) => (
          <path
            key={i}
            d={d}
            className="stroke-accent"
            strokeWidth={1.5}
            fill="none"
          />
        ))}
        {dataIdx.map((i) => {
          const p = drawn[i];
          return (
            <g key={p.dateKey} pointerEvents="none">
              {pickedIdx === i && (
                <circle
                  cx={x(i)}
                  cy={y(p.v!)}
                  r={5}
                  className="fill-surface stroke-accent"
                  strokeWidth={1.5}
                />
              )}
              <circle
                cx={x(i)}
                cy={y(p.v!)}
                r={i === latest ? 3 : 2}
                className="fill-accent"
              />
            </g>
          );
        })}
        {/* Direct labels on the extremes — the axis Tufte erased. */}
        <text
          x={x(maxIdx)}
          y={y(maxV) - 6}
          textAnchor={anchor(maxIdx)}
          className="fill-ink-soft"
          fontSize={10}
          pointerEvents="none"
        >
          {fmt(maxV)}
        </text>
        {minIdx !== maxIdx && (
          <text
            x={x(minIdx)}
            y={y(minV) + 12}
            textAnchor={anchor(minIdx)}
            className="fill-ink-soft"
            fontSize={10}
            pointerEvents="none"
          >
            {fmt(minV)}
          </text>
        )}
      </svg>
    </section>
  );
}

/**
 * The one non-sparkline: a 24-bin histogram of the hour each day was
 * solved ("when do I play"). Same Tufte discipline — accent bars are
 * the only ink, the baseline is the sole scaffold, four sparse clock
 * ticks instead of an axis, and the peak (or tapped) bin is labeled
 * directly with its day count.
 */
function HourChart<Day extends { dateKey: string }>({
  metric,
  days,
  dates,
}: {
  metric: { label: string; value: (day: Day) => number | null };
  days: Record<string, Day>;
  dates: string[];
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const bins = Array.from({ length: 24 }, () => 0);
  for (const dateKey of dates) {
    const day = days[dateKey];
    const h = day ? metric.value(day) : null;
    if (h !== null && h >= 0 && h < 24) bins[Math.floor(h)] += 1;
  }
  const filled = bins.flatMap((n, h) => (n > 0 ? [h] : []));
  if (filled.length === 0) return null;

  const maxN = Math.max(...bins);
  const peak = bins.indexOf(maxN);
  const W = 360;
  const H = 56;
  const TOP = 14;
  const slot = W / 24;
  const barW = 7;
  const x = (h: number) => h * slot + slot / 2;
  const y = (n: number) => H - (n / maxN) * (H - TOP);
  // A picked hour whose bin emptied (the window slid) falls back to
  // the peak instead of labeling a bar that no longer exists.
  const pickedLive = picked !== null && bins[picked] > 0 ? picked : null;
  const labeled = pickedLive ?? peak;
  const dayCount = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
  const pickNearest = (e: PointerEvent<SVGSVGElement>) => {
    const h = nearestAt(e, W, x, filled);
    setPicked((cur) => (cur === h ? null : h));
  };

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold">{metric.label}</h2>
        <p className="text-xs text-ink-soft">
          {pickedLive !== null
            ? `${fmtHour(pickedLive)} · ${dayCount(bins[pickedLive])}`
            : `Most often ${fmtHour(peak)}`}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H + 18}`}
        className="mt-1 w-full touch-manipulation select-none"
        role="img"
        aria-label={`${metric.label}: most solves around ${fmtHour(peak)}.`}
        onPointerDown={pickNearest}
      >
        <line
          x1={0}
          x2={W}
          y1={H}
          y2={H}
          className="stroke-line"
          strokeWidth={1}
        />
        {filled.map((h) => (
          <rect
            key={h}
            x={x(h) - barW / 2}
            y={y(bins[h])}
            width={barW}
            height={H - y(bins[h])}
            rx={1.5}
            className="fill-accent"
            pointerEvents="none"
          />
        ))}
        <text
          x={x(labeled)}
          y={y(bins[labeled]) - 4}
          textAnchor={x(labeled) < 24 ? "start" : x(labeled) > W - 24 ? "end" : "middle"}
          className="fill-ink-soft"
          fontSize={10}
          pointerEvents="none"
        >
          {bins[labeled]}
        </text>
        {[0, 6, 12, 18].map((h) => (
          <text
            key={h}
            x={x(h)}
            y={H + 13}
            textAnchor={h === 0 ? "start" : "middle"}
            className="fill-ink-soft"
            fontSize={9}
            pointerEvents="none"
          >
            {["12a", "6a", "12p", "6p"][h / 6]}
          </text>
        ))}
      </svg>
    </section>
  );
}

function fmtHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function shortDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
