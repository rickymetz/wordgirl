import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Bookmark, ExternalLink, X } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { loadDictionary } from "../lib/words/loader";
import { HomeLink } from "../components/HomeLink";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const BOOKMARKS_KEY = "wg:v1:local:dictionary:bookmarks";
const MIN_LEN = 2;
const MAX_LEN = 15;
const ROW_HEIGHT = 44;

function buildMatcher(pattern: string): ((word: string) => boolean) | null {
  const p = pattern.trim().toLowerCase();
  if (!p) return null;
  if (!p.includes("*") && !p.includes("?")) {
    return (w) => w.includes(p);
  }
  const escaped = p.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    "^" + escaped.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
  );
  return (w) => re.test(w);
}

function loadBookmarks(): Set<string> {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveBookmarks(bookmarks: Set<string>) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...bookmarks]));
}

type Filter = "all" | "core" | "bookmarked";

export function DictionaryPage() {
  const dict = use(loadDictionary());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [bookmarks, setBookmarks] = useState(loadBookmarks);
  const [lenMin, setLenMin] = useState(MIN_LEN);
  const [lenMax, setLenMax] = useState(MAX_LEN);
  const listRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);

  const allWords = useMemo(() => {
    const words: { word: string; tier: "required" | "bonus" }[] = [];
    for (const tier of ["required", "bonus"] as const) {
      const buckets = dict[tier].buckets;
      for (const [, bucket] of buckets) {
        for (const word of bucket) {
          words.push({ word, tier });
        }
      }
    }
    words.sort((a, b) => a.word.localeCompare(b.word));
    return words;
  }, [dict]);

  const lengthActive = lenMin > MIN_LEN || lenMax < MAX_LEN;

  const filtered = useMemo(() => {
    let result = allWords;

    if (filter === "core") {
      result = result.filter((w) => w.tier === "required");
    } else if (filter === "bookmarked") {
      result = result.filter((w) => bookmarks.has(w.word));
    }

    if (lengthActive) {
      result = result.filter(
        (w) =>
          w.word.length >= lenMin &&
          (lenMax >= MAX_LEN || w.word.length <= lenMax),
      );
    }

    const match = buildMatcher(query);
    if (match) {
      result = result.filter((w) => match(w.word));
    }

    return result;
  }, [allWords, query, filter, bookmarks, lenMin, lenMax, lengthActive]);

  const letterOffsets = useMemo(() => {
    const offsets = new Map<string, number>();
    for (let i = 0; i < filtered.length; i++) {
      const ch = filtered[i].word[0].toUpperCase();
      if (!offsets.has(ch)) offsets.set(ch, i);
    }
    return offsets;
  }, [filtered]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  const [visibleLetter, setVisibleLetter] = useState("A");

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const scrollTop = el.scrollTop;
        const idx = Math.floor(scrollTop / ROW_HEIGHT);
        const entry = filtered[Math.min(idx, filtered.length - 1)];
        if (entry) setVisibleLetter(entry.word[0].toUpperCase());
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [filtered]);

  const toggleBookmark = useCallback(
    (word: string) => {
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (next.has(word)) next.delete(word);
        else next.add(word);
        saveBookmarks(next);
        return next;
      });
    },
    [],
  );

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const [scrubbing, setScrubbing] = useState(false);
  const scrubbingRef = useRef(false);
  const [scrubLetter, setScrubLetter] = useState<string | null>(null);

  const lastScrubIdx = useRef(-1);
  const scrubTo = useCallback(
    (clientY: number) => {
      const el = scrubberRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
      const idx = Math.min(Math.floor((y / rect.height) * 26), 25);
      if (idx === lastScrubIdx.current) return;
      lastScrubIdx.current = idx;
      const letter = ALPHABET[idx];
      setScrubLetter(letter);

      const offset = letterOffsets.get(letter);
      if (offset != null) {
        virtualizer.scrollToIndex(offset, { align: "start" });
      }
    },
    [letterOffsets, virtualizer],
  );

  const onScrubStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      lastScrubIdx.current = -1;
      scrubbingRef.current = true;
      setScrubbing(true);
      scrubTo(e.clientY);
    },
    [scrubTo],
  );

  const onScrubMove = useCallback(
    (e: React.PointerEvent) => {
      if (!scrubbingRef.current) return;
      e.preventDefault();
      scrubTo(e.clientY);
    },
    [scrubTo],
  );

  const onScrubEnd = useCallback(() => {
    scrubbingRef.current = false;
    setScrubbing(false);
    setScrubLetter(null);
  }, []);

  const activeLetter = scrubbing ? scrubLetter : visibleLetter;

  return (
    <div data-level="neutral" className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-4 md:max-w-2xl">
      <header className="flex items-center justify-between pt-6 pb-2">
        <HomeLink />
        <span className="text-sm text-ink-soft">
          {allWords.length.toLocaleString()} words
        </span>
      </header>

      <h1 className="text-2xl font-bold tracking-tight">Dictionary</h1>

      {/* Search bar */}
      <div className="relative mt-4">
        <Search
          aria-hidden
          className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search words…"
          className="w-full rounded-xl border border-line bg-surface-raised py-2.5 pr-9 pl-9 text-sm text-ink outline-none placeholder:text-ink-soft focus:border-accent focus:ring-1 focus:ring-accent"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); }}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 p-0.5 text-ink-soft active:scale-90"
            aria-label="Clear search"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-1 text-[10px] text-ink-soft/60">
        Use <span className="font-semibold">*</span> for any letters, <span className="font-semibold">?</span> for one — e.g. <span className="font-mono">un*ing</span>, <span className="font-mono">p??le</span>
      </p>

      {/* Filter pills */}
      <div className="mt-3 flex gap-2">
        <FilterPill
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="All"
        />
        <FilterPill
          active={filter === "core"}
          onClick={() => setFilter("core")}
          label="Core"
        />
        <FilterPill
          active={filter === "bookmarked"}
          onClick={() => setFilter("bookmarked")}
          label={`Saved${bookmarks.size ? ` (${bookmarks.size})` : ""}`}
        />
      </div>

      {/* Length filter */}
      <RangeSlider
        min={MIN_LEN}
        max={MAX_LEN}
        low={lenMin}
        high={lenMax}
        onLowChange={setLenMin}
        onHighChange={setLenMax}
      />

      <p className="mt-3 text-xs text-ink-soft">
        {filtered.length.toLocaleString()} word{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Main content: word list + scrubber */}
      <div className="relative mt-1 min-h-0 grow">
        {/* Word list */}
        <div
          ref={listRef}
          className="absolute inset-0 overflow-y-auto pr-7"
          role="list"
          aria-label="Dictionary words"
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 pt-16 text-center text-ink-soft">
              <p className="text-sm">No words found</p>
            </div>
          ) : (
            <div
              className="relative w-full"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualizer.getVirtualItems().map((vRow) => {
                const entry = filtered[vRow.index];
                return (
                  <div
                    key={entry.word}
                    className="absolute left-0 w-full"
                    style={{ top: vRow.start, height: vRow.size }}
                  >
                    <WordRow
                      word={entry.word}
                      tier={entry.tier}
                      bookmarked={bookmarks.has(entry.word)}
                      onToggle={toggleBookmark}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alphabet scrubber */}
        <div
          ref={scrubberRef}
          className="absolute inset-y-0 right-0 flex touch-none select-none flex-col justify-between py-1"
          onPointerDown={onScrubStart}
          onPointerMove={onScrubMove}
          onPointerUp={onScrubEnd}
          onPointerCancel={onScrubEnd}
          aria-hidden
        >
          {ALPHABET.map((letter) => {
            const has = letterOffsets.has(letter);
            const isActive = activeLetter === letter;
            return (
              <div
                key={letter}
                data-letter={letter}
                className={`relative flex h-full w-6 items-center justify-center text-[10px] font-semibold leading-none ${
                  isActive
                    ? "text-accent"
                    : has
                      ? "text-ink-soft"
                      : "text-ink-soft/30"
                }`}
              >
                {letter}
                {isActive && scrubbing && (
                  <div className="absolute right-8 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg font-bold text-surface shadow-lg">
                    {letter}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WordRow({
  word,
  tier,
  bookmarked,
  onToggle,
}: {
  word: string;
  tier: "required" | "bonus";
  bookmarked: boolean;
  onToggle: (word: string) => void;
}) {
  return (
    <div
      role="listitem"
      className="flex items-center gap-3 border-b border-line/50"
    >
      <a
        href={`https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 grow items-center gap-1.5 font-mono text-sm tracking-wide text-ink active:text-accent"
      >
        {word}
        <ExternalLink aria-hidden className="h-3 w-3 shrink-0 text-ink-soft/40" />
      </a>
      {word.length === 2 ? (
        <span className="shrink-0 rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
          doublet
        </span>
      ) : tier === "required" ? (
        <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
          core
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => onToggle(word)}
        aria-label={bookmarked ? `unsave ${word}` : `save ${word}`}
        className="-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center active:scale-90"
      >
        <Bookmark
          aria-hidden
          className={`h-4 w-4 ${
            bookmarked
              ? "fill-accent text-accent"
              : "text-ink-soft/40"
          }`}
        />
      </button>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-ink text-surface"
          : "bg-surface-raised text-ink-soft border border-line"
      }`}
    >
      {label}
    </button>
  );
}

function RangeSlider({
  min,
  max,
  low,
  high,
  onLowChange,
  onHighChange,
}: {
  min: number;
  max: number;
  low: number;
  high: number;
  onLowChange: (v: number) => void;
  onHighChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"low" | "high" | null>(null);
  const range = max - min;

  const pctLow = ((low - min) / range) * 100;
  const pctHigh = ((high - min) / range) * 100;

  const resolve = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = Math.round(min + pct * range);

      if (dragging.current === "low") {
        onLowChange(Math.min(raw, high));
      } else if (dragging.current === "high") {
        onHighChange(Math.max(raw, low));
      }
    },
    [min, range, low, high, onLowChange, onHighChange],
  );

  const onPointerDown = useCallback(
    (thumb: "low" | "high") => (e: React.PointerEvent) => {
      e.stopPropagation();
      dragging.current = thumb;
      const track = trackRef.current;
      if (track) track.setPointerCapture(e.pointerId);
    },
    [],
  );

  const onTrackPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const val = min + pct * range;
      const distLow = Math.abs(val - low);
      const distHigh = Math.abs(val - high);
      dragging.current = distLow <= distHigh ? "low" : "high";
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      resolve(e.clientX);
    },
    [min, range, low, high, resolve],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      resolve(e.clientX);
    },
    [resolve],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const active = low > min || high < max;
  const label = active
    ? `${low}–${high} letters`
    : "Word length";

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-soft">{label}</span>
        {active && (
          <button
            type="button"
            onClick={() => { onLowChange(min); onHighChange(max); }}
            className="text-[10px] font-semibold text-accent active:scale-90"
          >
            Reset
          </button>
        )}
      </div>
      <div
        ref={trackRef}
        className="relative mx-2 h-8 touch-none select-none"
        onPointerDown={onTrackPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Track background */}
        <div className="absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 rounded-full bg-line" />
        {/* Active range */}
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent"
          style={{ left: `${pctLow}%`, right: `${100 - pctHigh}%` }}
        />
        {/* Low thumb */}
        <div
          className="absolute top-1/2 z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-accent bg-surface shadow-sm active:cursor-grabbing"
          style={{ left: `${pctLow}%` }}
          onPointerDown={onPointerDown("low")}
        />
        {/* High thumb */}
        <div
          className="absolute top-1/2 z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-accent bg-surface shadow-sm active:cursor-grabbing"
          style={{ left: `${pctHigh}%` }}
          onPointerDown={onPointerDown("high")}
        />
      </div>
      <div className="mx-2 flex justify-between text-[10px] text-ink-soft/60">
        <span>{min}</span>
        <span>{max}+</span>
      </div>
    </div>
  );
}
