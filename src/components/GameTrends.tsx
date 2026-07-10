import { useEffect, useState } from "react";
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
  format: (v: number) => string;
  /** Lower is better (solve time) — picks which extreme "Best" shows. */
  lowerIsBetter?: boolean;
}

export interface GameTrendsConfig<Day extends { dateKey: string }> {
  gameId: string;
  accent: string | number;
  epoch: string;
  loadAllDays: () => Promise<Record<string, Day>>;
  metrics: TrendMetric<Day>[];
}

const WINDOW_DAYS = 30;

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
      className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-12"
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

      {days &&
        config.metrics.map((m) => (
          <MetricChart key={m.key} metric={m} days={days} dates={from} />
        ))}
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

function MetricChart<Day extends { dateKey: string }>({
  metric,
  days,
  dates,
}: {
  metric: TrendMetric<Day>;
  days: Record<string, Day>;
  dates: string[];
}) {
  const [picked, setPicked] = useState<number | null>(null);
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
  const latestIdx = points.reduce(
    (acc, p, i) => (p.v === null ? acc : i),
    -1,
  );
  const pickedPoint = picked === null ? null : points[picked];

  // Sparkline geometry: dots on played days, thin segments joining
  // CONSECUTIVE days only (a skipped day breaks the line — a gap is
  // data), headroom above/below for the direct min/max labels.
  const W = 360;
  const H = 76;
  const TOP = 16;
  const BOTTOM = 16;
  const slot = W / points.length;
  const x = (i: number) => i * slot + slot / 2;
  const y = (v: number) =>
    maxV === minV
      ? TOP + (H - TOP - BOTTOM) / 2
      : TOP + ((maxV - v) / (maxV - minV)) * (H - TOP - BOTTOM);

  const segments: string[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1].v;
    const b = points[i].v;
    if (a !== null && b !== null) {
      segments.push(`M${x(i - 1)},${y(a)} L${x(i)},${y(b)}`);
    }
  }
  const dataIdx = points.flatMap((p, i) => (p.v === null ? [] : [i]));
  const maxIdx = dataIdx.find((i) => points[i].v === maxV)!;
  const minIdx = dataIdx.find((i) => points[i].v === minV)!;
  // Keep edge labels inside the frame.
  const anchor = (i: number) =>
    x(i) < 36 ? "start" : x(i) > W - 36 ? "end" : "middle";

  return (
    <section className="mb-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold">{metric.label}</h2>
        <p className="text-xs font-semibold text-ink-soft">
          {pickedPoint && pickedPoint.v !== null
            ? `${shortDate(pickedPoint.dateKey)} · ${metric.format(pickedPoint.v)}`
            : `Best ${metric.format(best)} · Avg ${metric.format(avg)}`}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H + 8}`}
        className="mt-1 w-full touch-manipulation select-none"
        role="img"
        aria-label={`${metric.label}, last ${dates.length} days. Best ${metric.format(best)}, average ${metric.format(avg)}${latestIdx >= 0 && points[latestIdx].v !== null ? `, latest ${metric.format(points[latestIdx].v)}` : ""}.`}
      >
        {/* Range-frame: the only scaffold, spanning exactly the
            played days. */}
        <line
          x1={x(dataIdx[0])}
          x2={x(dataIdx[dataIdx.length - 1])}
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
          const p = points[i];
          const isLatest = i === latestIdx;
          const isPicked = picked === i;
          return (
            <g key={p.dateKey}>
              <rect
                x={i * slot}
                y={0}
                width={slot}
                height={H + 8}
                fill="transparent"
                onPointerDown={() =>
                  setPicked((cur) => (cur === i ? null : i))
                }
              />
              {isPicked && (
                <circle
                  cx={x(i)}
                  cy={y(p.v!)}
                  r={6}
                  className="fill-surface stroke-accent"
                  strokeWidth={1.5}
                  pointerEvents="none"
                />
              )}
              <circle
                cx={x(i)}
                cy={y(p.v!)}
                r={isLatest ? 3.5 : 2.25}
                className="fill-accent"
                pointerEvents="none"
              />
            </g>
          );
        })}
        {/* Direct labels on the extremes — the axis Tufte erased. */}
        <text
          x={x(maxIdx)}
          y={y(maxV) - 7}
          textAnchor={anchor(maxIdx)}
          className="fill-ink-soft font-semibold"
          fontSize={10}
          pointerEvents="none"
        >
          {metric.format(maxV)}
        </text>
        {minIdx !== maxIdx && (
          <text
            x={x(minIdx)}
            y={y(minV) + 13}
            textAnchor={anchor(minIdx)}
            className="fill-ink-soft font-semibold"
            fontSize={10}
            pointerEvents="none"
          >
            {metric.format(minV)}
          </text>
        )}
      </svg>
    </section>
  );
}

function shortDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
