import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HomeLink } from "./HomeLink";
import { dateKeyRange, localDateKey } from "../lib/date";

/**
 * The stats-over-time page every game gets from a config (GameArchive's
 * sibling). Each metric renders as its OWN single-series bar chart in
 * the game's accent — one hue per chart, no legends needed (the title
 * names the series), text in ink tokens, values on tap. The four game
 * accents fail as a categorical SET (validated), so cross-game
 * comparison charts are deliberately not a thing.
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

  const max = Math.max(...values, 1);
  const best = metric.lowerIsBetter
    ? Math.min(...values)
    : Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const latest = [...points].reverse().find((p) => p.v !== null);
  const pickedPoint = picked === null ? null : points[picked];

  // SVG geometry: 100 units tall, one slot per day, 2-unit surface
  // gaps between bars (the spacer rule), rounded data-ends.
  const W = 360;
  const slot = W / points.length;
  // Slim bars even with a short history: a one-day chart is a bar,
  // not a slab.
  const bar = Math.max(2, Math.min(14, slot - 2));

  return (
    <section className="mb-4 rounded-2xl bg-surface-tint px-5 py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold">{metric.label}</h2>
        <p className="text-xs font-semibold text-ink-soft">
          {pickedPoint && pickedPoint.v !== null
            ? `${shortDate(pickedPoint.dateKey)} · ${metric.format(pickedPoint.v)}`
            : `Best ${metric.format(best)} · Avg ${metric.format(avg)}`}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${W} 108`}
        className="mt-2 w-full touch-manipulation select-none"
        role="img"
        aria-label={`${metric.label}, last ${dates.length} days. Best ${metric.format(best)}, average ${metric.format(avg)}${latest && latest.v !== null ? `, latest ${metric.format(latest.v)}` : ""}.`}
      >
        {points.map((p, i) =>
          p.v === null ? null : (
            <g key={p.dateKey}>
              {/* Invisible full-height hit target: bigger than the mark. */}
              <rect
                x={i * slot}
                y={0}
                width={slot}
                height={108}
                fill="transparent"
                onPointerDown={() =>
                  setPicked((cur) => (cur === i ? null : i))
                }
              />
              <rect
                x={i * slot + (slot - bar) / 2}
                y={104 - (p.v / max) * 100}
                width={bar}
                height={Math.max(3, (p.v / max) * 100)}
                rx={Math.min(2, bar / 2)}
                className={
                  picked === null || picked === i
                    ? "fill-accent"
                    : "fill-accent/35"
                }
                pointerEvents="none"
              />
            </g>
          ),
        )}
        {/* Recessive baseline. */}
        <rect x={0} y={104} width={W} height={1.5} className="fill-line" />
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
