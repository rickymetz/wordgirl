import { use, useCallback, useMemo, useRef, useState } from "react";
import { Search, Bookmark, X } from "lucide-react";
import { loadDictionary } from "../lib/words/loader";
import { HomeLink } from "../components/HomeLink";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const BOOKMARKS_KEY = "wg:v1:local:dictionary:bookmarks";

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

type Filter = "all" | "bookmarked";

export function DictionaryPage() {
  const dict = use(loadDictionary());
  const [query, setQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [bookmarks, setBookmarks] = useState(loadBookmarks);
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

  const filtered = useMemo(() => {
    let result = allWords;

    if (filter === "bookmarked") {
      result = result.filter((w) => bookmarks.has(w.word));
    }

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((w) => w.word.includes(q));
    } else if (activeLetter) {
      result = result.filter(
        (w) => w.word[0] === activeLetter.toLowerCase(),
      );
    }

    return result;
  }, [allWords, query, activeLetter, filter, bookmarks]);

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
    if (value.trim()) setActiveLetter(null);
  }, []);

  const handleLetterTap = useCallback((letter: string) => {
    setActiveLetter((prev) => (prev === letter ? null : letter));
    setQuery("");
    listRef.current?.scrollTo(0, 0);
  }, []);

  const handleScrub = useCallback(
    (e: React.PointerEvent) => {
      const el = scrubberRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
      const idx = Math.min(
        Math.floor((y / rect.height) * 26),
        25,
      );
      const letter = ALPHABET[idx];
      setActiveLetter(letter);
      setQuery("");
      listRef.current?.scrollTo(0, 0);
    },
    [],
  );

  const showPrompt = !query.trim() && !activeLetter && filter === "all";
  const letterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const source = filter === "bookmarked"
      ? allWords.filter((w) => bookmarks.has(w.word))
      : allWords;
    for (const w of source) {
      const ch = w.word[0].toUpperCase();
      counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
    return counts;
  }, [allWords, filter, bookmarks]);

  return (
    <div className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-4">
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

      {/* Filter pills */}
      <div className="mt-3 flex gap-2">
        <FilterPill
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="All"
        />
        <FilterPill
          active={filter === "bookmarked"}
          onClick={() => setFilter("bookmarked")}
          label={`Saved${bookmarks.size ? ` (${bookmarks.size})` : ""}`}
        />
      </div>

      {/* Main content: word list + scrubber */}
      <div className="relative mt-3 flex min-h-0 grow">
        {/* Word list */}
        <div
          ref={listRef}
          className="grow overflow-y-auto pr-7"
          role="list"
          aria-label="Dictionary words"
        >
          {showPrompt ? (
            <div className="flex flex-col items-center justify-center gap-2 pt-16 text-center text-ink-soft">
              <p className="text-sm">Search or pick a letter to browse</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 pt-16 text-center text-ink-soft">
              <p className="text-sm">No words found</p>
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs text-ink-soft">
                {filtered.length.toLocaleString()} word{filtered.length !== 1 ? "s" : ""}
              </p>
              {filtered.slice(0, 500).map((entry) => (
                <WordRow
                  key={entry.word}
                  word={entry.word}
                  tier={entry.tier}
                  bookmarked={bookmarks.has(entry.word)}
                  onToggle={toggleBookmark}
                />
              ))}
              {filtered.length > 500 && (
                <p className="py-4 text-center text-xs text-ink-soft">
                  Showing first 500 of {filtered.length.toLocaleString()}.
                  Search to narrow results.
                </p>
              )}
            </>
          )}
        </div>

        {/* Alphabet scrubber */}
        <div
          ref={scrubberRef}
          className="absolute top-0 right-0 flex h-full touch-none select-none flex-col justify-between py-1"
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            handleScrub(e);
          }}
          onPointerMove={(e) => {
            if (e.pressure > 0) handleScrub(e);
          }}
          aria-hidden
        >
          {ALPHABET.map((letter) => {
            const has = (letterCounts.get(letter) ?? 0) > 0;
            return (
              <div
                key={letter}
                data-letter={letter}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handleLetterTap(letter);
                }}
                className={`flex h-full w-6 cursor-pointer items-center justify-center text-[10px] font-semibold leading-none ${
                  activeLetter === letter
                    ? "text-accent"
                    : has
                      ? "text-ink-soft"
                      : "text-ink-soft/30"
                }`}
              >
                {letter}
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
      className="flex items-center gap-3 border-b border-line/50 py-2"
    >
      <span className="grow font-mono text-sm tracking-wide text-ink">
        {word}
      </span>
      {tier === "required" && (
        <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
          core
        </span>
      )}
      <button
        type="button"
        onClick={() => onToggle(word)}
        aria-label={bookmarked ? `unsave ${word}` : `save ${word}`}
        className="-m-1.5 p-1.5 active:scale-90"
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
