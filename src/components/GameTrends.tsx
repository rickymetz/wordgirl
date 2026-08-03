import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { HomeLink } from "./HomeLink";
import { trackStatsDay } from "../lib/analytics";
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

  /**
   * The day being read, shared by every sparkline on the page.
   *
   * It lives up here rather than in each chart because the question a
   * player asks is about a DAY, not a metric: picking Tuesday on the
   * solve-time line and having to hunt for Tuesday again on every other
   * line to see what else happened is the whole comparison done by hand.
   * One pick, and the page reads out that day everywhere it has one.
   *
   * By date, not index — the window slides at midnight, and a date that
   * has fallen off simply stops matching instead of quietly denoting some
   * other day.
   */
  const [picked, setPicked] = useState<string | null>(null);
  // Counted once a visit, from whichever chart the player reached for.
  const dayReadRef = useRef(false);
  // Tapping the day already being read puts the summaries back, from
  // whichever chart the second tap lands on.
  const pick = (dateKey: string | null) => {
    if (!dayReadRef.current) {
      dayReadRef.current = true;
      trackStatsDay(config.gameId);
    }
    setPicked((cur) => (cur !== null && cur === dateKey ? null : dateKey));
  };

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
          {config.metrics.map((m, i) => (
            <MetricChart
              key={m.key}
              metric={m}
              days={days}
              dates={from}
              // The lone last chart of an odd set gets the full width. Its
              // viewBox widens to match, so the marks stay the size every
              // other sparkline draws them — stretching a fixed viewBox
              // instead would scale the dots and labels to twice everyone
              // else's, which is not a wider chart but a different one.
              wide={i === config.metrics.length - 1 && i % 2 === 0}
              picked={picked}
              onPick={pick}
            />
          ))}
        </div>
      )}
      {days && config.hours && (
        <HourChart
          metric={config.hours}
          days={days}
          dates={from}
          pickedDate={picked}
          onPickDate={setPicked}
        />
      )}
      {days &&
        config.metrics.every(
          (m) =>
            from.filter((d) => days[d] && m.value(days[d]) !== null).length <
            2,
        ) && (
          // Said as a fact about the charts above rather than an
          // instruction: with one day played they DO draw, a single dot
          // each, and telling someone to "play a few days" under a chart
          // they can already see reads as though it had not noticed them.
          <p className="pt-6 text-sm text-ink-soft">
            One day so far — the lines join up as you play.
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
  wide = false,
  picked,
  onPick,
}: {
  metric: TrendMetric<Day>;
  days: Record<string, Day>;
  dates: string[];
  /** Draws across both grid columns — see the call site. */
  wide?: boolean;
  /** The day the whole page is reading, or null for the summaries. */
  picked: string | null;
  onPick: (dateKey: string | null) => void;
}) {
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

  /**
   * "Best" is worth its half of the summary line only while it
   * distinguishes a day. On a counter with a floor — rotations,
   * take-backs, hints, rejected words — "Best 0" is true again the moment
   * any clean day happens, and then it never moves: half the line spent
   * on a constant. Where the best value is the common case, the latest
   * day goes there instead, which always has something to say.
   */
  const bestIsCommon =
    values.filter((v) => v === best).length > values.length / 2;

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
  /**
   * The page's day, on a chart that has no value for it — an unsolved
   * day on a solved-only metric, or one before this metric shipped.
   *
   * It still says the date, with a dash for the value. Falling back to
   * the summary would leave the chart looking untouched while its
   * neighbours read out a day, which is exactly the wrong impression:
   * the day IS selected here, there is simply nothing to report.
   */
  const pickedElsewhere = picked !== null && pickedPoint === null;

  // Sparkline geometry, sized for a HALF-width grid cell: dots on
  // played days, thin segments joining CONSECUTIVE days only,
  // headroom above and below for the direct min/max labels.
  // Both are rendered w-full, so a viewBox twice as wide inside a cell
  // twice as wide puts every mark on screen at the same size — the extra
  // room buys resolution along the line, not bigger dots.
  const W = wide ? 356 : 168;
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
    onPick(drawn[nearestAt(e, W, x, dataIdx)].dateKey);
  };

  /**
   * The same reading by keyboard. Tapping a day was pointer-only, so the
   * per-day values simply did not exist for anyone using a keyboard —
   * the summary in the aria-label was all they could reach. Arrows step
   * played days (skipping the gaps, since only played days have values),
   * Home/End jump to the ends, Escape puts the readout back.
   */
  const step = (delta: number) => {
    const at = pickedIdx === null ? -1 : dataIdx.indexOf(pickedIdx);
    // From nothing, step in from the latest day — the one a player is
    // most likely to want, and where the eye already is.
    const next =
      at === -1
        ? dataIdx.length - 1
        : Math.min(dataIdx.length - 1, Math.max(0, at + delta));
    onPick(drawn[dataIdx[next]].dateKey);
  };
  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "Home") onPick(drawn[dataIdx[0]].dateKey);
    else if (e.key === "End") onPick(drawn[latest].dateKey);
    else if (e.key === "Escape") onPick(null);
    else return;
    e.preventDefault();
  };

  return (
    <section className={`flex min-w-0 flex-col ${wide ? "col-span-2" : ""}`}>
      <h2 className="text-sm leading-tight font-bold">{metric.label}</h2>
      {/* pb, not just pt: the byline reads as a caption on the title, and
          without a floor under it the line sat as close to the chart's
          top label as to the heading it belongs to. `mt-auto` on the svg
          only spaces it where the grid row is taller than this cell, so
          the separation has to be the byline's own. */}
      <p className="pt-0.5 pb-2 text-xs text-ink-soft">
        {pickedPoint
          ? `${shortDate(pickedPoint.dateKey)} · ${fmt(pickedPoint.v!)}`
          : pickedElsewhere
            ? `${shortDate(picked)} · —`
            : bestIsCommon
            ? `Latest ${fmt(drawn[latest].v!)} · Avg ${fmt(avg)}`
            : `Best ${fmt(best)} · Avg ${fmt(avg)}`}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H + 8}`}
        className="mt-auto w-full touch-manipulation select-none outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        // A figure a keyboard can walk, so it takes a tab stop and says
        // what the arrows do. The picked day rides the label rather than a
        // live region: this IS the element focus is on, so a screen reader
        // re-reads it as the selection moves.
        role="img"
        tabIndex={0}
        aria-label={
          pickedPoint
            ? `${metric.label}: ${shortDate(pickedPoint.dateKey)}, ${fmt(pickedPoint.v!)}. Arrow keys to move between days.`
            : pickedElsewhere
              ? `${metric.label}: nothing recorded on ${shortDate(picked)}. Arrow keys to move between days.`
              : `${metric.label}, last ${dates.length} days. Best ${fmt(best)}, average ${fmt(avg)}, latest ${fmt(drawn[latest].v!)}. Arrow keys to read a day.`
        }
        onPointerDown={pickNearest}
        onKeyDown={onKeyDown}
      >
        {/* Range-frame: the only scaffold, spanning exactly the played
            days. Dropped when every day shares one value — a frame states
            the range the data covers, and with no range it is just a rule
            stranded below a flat line, reading as another chart's axis. */}
        {maxV !== minV && (
          <line
            x1={x(dataIdx[0])}
            x2={x(latest)}
            y1={H}
            y2={H}
            className="stroke-line"
            strokeWidth={1}
          />
        )}
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
  pickedDate,
  onPickDate,
}: {
  metric: { label: string; value: (day: Day) => number | null };
  days: Record<string, Day>;
  dates: string[];
  /** The day the sparklines are reading, if any. */
  pickedDate: string | null;
  onPickDate: (dateKey: string | null) => void;
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
  /**
   * The hour the picked DAY was solved at, when the sparklines are
   * reading one. This chart is indexed by hour rather than by date, so it
   * cannot show the day itself — what it can show is where that day sits
   * in the distribution, which is the same question asked of this axis.
   */
  const dayHour = (() => {
    if (pickedDate === null) return null;
    const day = days[pickedDate];
    const h = day ? metric.value(day) : null;
    return h !== null && h >= 0 && h < 24 ? Math.floor(h) : null;
  })();
  // A picked hour whose bin emptied (the window slid) falls back to
  // the peak instead of labeling a bar that no longer exists.
  const pickedLive = picked !== null && bins[picked] > 0 ? picked : null;
  const labeled = dayHour ?? pickedLive ?? peak;
  const dayCount = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
  const pickNearest = (e: PointerEvent<SVGSVGElement>) => {
    const h = nearestAt(e, W, x, filled);
    // One selection at a time: reading an hour is a different question
    // from reading a day, and leaving a date up on the sparklines while
    // this chart answers about some other hour would put two readouts on
    // the page that do not agree.
    onPickDate(null);
    setPicked((cur) => (cur === h ? null : h));
  };

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold">{metric.label}</h2>
        <p className="text-xs text-ink-soft">
          {pickedDate !== null
            ? dayHour !== null
              ? `${shortDate(pickedDate)} · ${fmtHour(dayHour)}`
              : `${shortDate(pickedDate)} · —`
            : pickedLive !== null
              ? `${fmtHour(pickedLive)} · ${dayCount(bins[pickedLive])}`
              : `Most often ${fmtHour(peak)}`}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H + 18}`}
        className="mt-3 w-full touch-manipulation select-none"
        role="img"
        aria-label={
          pickedDate !== null && dayHour !== null
            ? `${metric.label}: ${shortDate(pickedDate)} solved at ${fmtHour(dayHour)}.`
            : pickedDate !== null
              ? `${metric.label}: nothing recorded on ${shortDate(pickedDate)}.`
              : `${metric.label}: most solves around ${fmtHour(peak)}.`
        }
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
