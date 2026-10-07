import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { CircleHelp, Equal, Grid3x3, Layers, Lightbulb, Shapes, Type } from "lucide-react";
import { formatDateKey, formatDuration, formatShareDate, localDateKey } from "../../../lib/date";
import { SHARE_URL } from "../../../lib/share";
import { ShareButton } from "../../../components/ShareButton";
import { DailyOutro } from "../../../components/game/DailyOutro";
import { HomeLink } from "../../../components/HomeLink";
import { trackCoach, trackHint } from "../../../lib/analytics";
import { GameToast, useToast } from "../../../components/game/GameToast";
import { ModalDialog } from "../../../components/ModalDialog";
import { CoachSheet, Key } from "../../../components/CoachSheet";
import { TutorialPrompt } from "../../../components/TutorialPrompt";
import { TutorialBanner } from "../../../components/game/TutorialBanner";
import { TutorialDone } from "../../../components/game/TutorialDone";
import { useTutorialProgress } from "../../../lib/tutorial/useTutorialProgress";
import { ConfettiOverlay } from "../../../components/ConfettiOverlay";
import { useSolveTransition } from "../../../lib/useSolveTransition";
import { useStorageBroken } from "../../../lib/useStorageBroken";
import { FACES } from "../engine/faces";
import { describeCard, hintLabel, hintText } from "../engine/hints";
import { dailyBoard, type Board, type BoardKind } from "../engine/schedule";
import { tutorialStepIndex } from "../engine/tutorial";
import { displayStreak, isDaySolved, loadDailyProgress, loadStats, loadTutorialSeen, markTutorialSeen } from "../state/persistence";
import type { Verdict } from "../state/reducer";
import { useTypesetGame, type GameMode } from "../state/useTypesetGame";
import { Glyph } from "./Glyph";
import { layoutGlyphs, type GlyphLayout } from "./glyphLayout";
import { TUTORIAL_RECAP, TUTORIAL_STEPS } from "./tutorialSteps";

const outroStreak = async (today: string) => displayStreak(await loadStats(), today);

const OTHER: Record<BoardKind, BoardKind> = { charset: "faces", faces: "charset" };

export function buildShareText(board: Board, found: number, hints: number, misses: number, dateKey: string, elapsedMs: number): string {
  const missPart = misses > 0 ? ` · ❌ ${misses}` : "";
  const hintPart = hints > 0 ? ` · 🫣 ${hints}` : " · 😎 0";
  return [
    `🖋️ Typeset — ${formatShareDate(dateKey)}`,
    `${board.label} · ${found}/${board.sets.length} sets · ⏱️ ${formatDuration(elapsedMs)}${missPart}${hintPart}`,
    SHARE_URL,
  ].join("\n");
}

function verdictText(v: Verdict, board: Board, foundCount: number): string {
  switch (v.kind) {
    case "found":
      return foundCount === board.sets.length ? "Every set found" : `Set! ${foundCount} of ${board.sets.length}`;
    case "already":
      return "Already found";
    case "miss":
      return "Not a set";
    case "hint":
      return hintText(board, v.fact);
    case "no-hint":
      return "That set is fully described";
  }
}

interface Props {
  mode: GameMode;
  /** Switch boards (daily, archive and practice). Absent in the tutorial. */
  onBoardChange?: (board: BoardKind) => void;
  onNewPuzzle?: () => void;
  onRestartTutorial?: () => void;
  onReplay?: () => void;
}

export function GameScreen({ mode, onBoardChange, onRestartTutorial }: Props) {
  const { state, dispatch, board, solvedElapsedMs, hydratedAsSolved } = useTypesetGame(mode);
  const isTutorial = mode.kind === "tutorial";
  const isDaily = mode.kind === "daily";
  const persisted = mode.kind === "daily" || mode.kind === "archive";
  const dateKey = persisted ? mode.dateKey : null;
  const kind = board.kind;

  const layout = useMemo(() => layoutGlyphs(board.glyphs, board.kind), [board]);
  const storageBroken = useStorageBroken();
  const { showConfetti, showResults } = useSolveTransition(state.solved, hydratedAsSolved);
  const tutorialStep = useTutorialProgress(tutorialStepIndex(state.found));
  const [coachOpen, setCoachOpen] = useState(false);

  // The other board of the date, for its tab label, its ✓, and the
  // hand-off once this one is done.
  const otherKind = OTHER[kind];
  const otherLabel = useMemo(() => {
    if (isTutorial) return null;
    if (dateKey) return dailyBoard(dateKey, otherKind).label;
    return otherKind === "faces" ? "Faces" : "Characters";
  }, [isTutorial, dateKey, otherKind]);
  const [otherSolved, setOtherSolved] = useState<boolean | null>(null);
  useEffect(() => {
    if (!dateKey) return;
    void loadDailyProgress(dateKey, otherKind).then((s) => setOtherSolved(s?.solved ?? false));
  }, [dateKey, otherKind, state.solved]);

  // Practice: offer a jump to the daily only while the DAY is unsolved.
  const [dailySolved, setDailySolved] = useState<boolean | null>(null);
  useEffect(() => {
    if (mode.kind !== "practice") return;
    void isDaySolved(localDateKey()).then(setDailySolved);
  }, [mode.kind]);

  // Hints in a daily or archive play are marked on the result, so the
  // first one asks.
  const [hintWarningOpen, setHintWarningOpen] = useState(false);
  const takeHint = () => {
    trackHint("typeset");
    dispatch({ type: "hint" });
  };
  const requestHint = () => {
    if (persisted && state.hints === 0) setHintWarningOpen(true);
    else takeHint();
  };

  // Outcomes: a toast over the board, narrated by the live region below.
  const { toast, show } = useToast();
  useEffect(() => {
    const v = state.verdict;
    if (!v) return;
    show(verdictText(v, board, state.found.length), v.kind === "hint" || v.kind === "miss" ? 3200 : 1600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.verdict?.id]);

  // Escape clears a half-made selection; dialogs own their own keys.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if ((e.target as HTMLElement | null)?.closest('[role="dialog"]')) return;
      setCoachOpen(false);
      setHintWarningOpen(false);
      dispatch({ type: "clear" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch]);

  const selectionAnnounce =
    state.selected.length > 0 ? `${state.selected.length} of 3 selected: ${state.selected.map((i) => describeCard(board, board.cards[i])).join(", ")}` : "";

  const archiveHref = "/games/typeset/archive";
  const rows = Math.ceil(board.cards.length / 3);

  return (
    <div data-level="typeset" className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-5 md:max-w-lg [@media(max-height:720px)]:pb-3">
      <header className="flex items-center justify-between pt-6 pb-2 [@media(max-height:720px)]:pt-3 [@media(max-height:720px)]:pb-1">
        {mode.kind === "archive" ? (
          <Link to={archiveHref} className="text-sm font-semibold text-ink-soft">
            ← Archive
          </Link>
        ) : (
          <HomeLink />
        )}
        <span className="flex items-center gap-2">
          {mode.kind === "practice" && dailySolved === false && (
            <Link to="/games/typeset" className="-my-3 inline-block py-3 text-sm font-semibold text-accent">
              New daily puzzle
            </Link>
          )}
          {!state.solved && !isTutorial && (
            <button
              type="button"
              className="relative flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-ink-soft select-none touch-manipulation active:scale-95 after:absolute after:inset-x-0 after:-inset-y-2.5"
              onPointerDown={(e) => e.preventDefault()}
              onClick={requestHint}
            >
              <Lightbulb aria-hidden className="h-3.5 w-3.5" />
              Hint{state.hints > 0 ? ` (${state.hints})` : ""}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              trackCoach("typeset");
              setCoachOpen(true);
            }}
            aria-label="how to play"
            className="relative -m-2 flex h-9 w-9 items-center justify-center rounded-full p-2 text-ink-soft active:scale-90 after:absolute after:-inset-1"
          >
            <CircleHelp aria-hidden className="h-5 w-5" />
          </button>
        </span>
      </header>

      <div className={`flex items-baseline gap-2 ${onBoardChange && !isTutorial ? "pb-1.5" : "pb-3"}`}>
        <h1 className="font-game text-2xl font-normal tracking-tight">Typeset</h1>
        <span aria-hidden className="self-center font-display text-2xl font-bold text-accent">
          ¶
        </span>
        {mode.kind === "archive" && <span className="text-base font-semibold text-ink-soft">{formatDateKey(mode.dateKey)}</span>}
        {mode.kind === "practice" && <span className="text-base font-semibold text-ink-soft">practice</span>}
        {isTutorial && <span className="text-base font-semibold text-ink-soft">tutorial</span>}
      </div>

      {onBoardChange && !isTutorial && otherLabel && (
        <div className="flex gap-1 pb-2 [@media(max-height:720px)]:pb-1" role="group" aria-label="Board">
          {(["charset", "faces"] as const).map((k) => {
            const current = k === kind;
            const label = current ? board.label : otherLabel;
            const solved = current ? state.solved : (otherSolved ?? false);
            return (
              <button
                key={k}
                type="button"
                aria-pressed={current}
                className={[
                  "relative rounded-full px-3.5 py-1 text-sm font-semibold select-none touch-manipulation transition-colors",
                  "after:absolute after:-inset-x-1 after:-inset-y-2.5",
                  current ? "bg-accent text-surface" : "bg-surface-tint text-ink-soft",
                ].join(" ")}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => onBoardChange(k)}
              >
                {label}
                {solved ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      )}

      {isTutorial && <TutorialBanner steps={TUTORIAL_STEPS} index={tutorialStep} />}

      {storageBroken && !isTutorial && (
        <p className="pb-2 text-xs font-semibold text-warn" role="alert">
          Progress can't be saved on this device.
        </p>
      )}


      {state.hintState.facts.length > 0 && !state.solved && (
        <ul className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-2 text-xs text-ink-soft" aria-label="Hints about an unfound set">
          <li className="font-semibold">Unfound set:</li>
          {state.hintState.facts.map((f, i) => (
            <li key={f.attribute}>
              {i > 0 && <span aria-hidden>· </span>}
              {hintLabel(board, f)}
            </li>
          ))}
        </ul>
      )}

      {/* The floor is the touch floor in PX (44px cards plus gaps), not rem:
          a rem floor grows with Huge text and pushes the page into a scroll
          long before a card is too small to tap. */}
      <div className="relative mt-3 flex flex-1 [@media(max-height:720px)]:mt-2" style={{ minHeight: rows * 44 + (rows - 1) * 8 }}>
        <div
          className="absolute inset-0 grid gap-2 select-none touch-manipulation"
          style={{
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {board.cards.map((card, i) => {
            const selected = state.selected.includes(i);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={selected}
                aria-label={describeCard(board, card)}
                disabled={state.solved}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => dispatch({ type: "tap", index: i })}
                className={[
                  "flex min-h-11 items-center justify-center gap-[2%] rounded-xl border bg-surface-raised transition-[box-shadow,background-color] duration-100",
                  selected ? "border-accent bg-surface-tint shadow-[inset_0_0_0_2px_var(--color-accent)]" : "border-line",
                ].join(" ")}
              >
                {Array.from({ length: card[1] + 1 }, (_, n) => (
                  <Glyph key={n} layout={layout} glyph={card[0]} ink={card[2]} fill={card[3]} className="h-[70%] w-[30%]" />
                ))}
              </button>
            );
          })}
        </div>
        {/* Centered over the board, not above it: the running hint list
            sits just above the board and must stay readable. */}
        <GameToast toast={toast} className="top-1/2 -translate-y-1/2" />
      </div>

      <AnimatePresence mode="wait">
        {state.solved && showResults && isTutorial ? (
          <motion.div key="tutorial-done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-3">
            <TutorialDone gameId="typeset" recap={TUTORIAL_RECAP} onRestart={onRestartTutorial} />
          </motion.div>
        ) : state.solved && showResults ? (
          <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2.5 pt-3">
            <p className="text-lg font-bold text-ink">{board.label} solved</p>
            {solvedElapsedMs !== null && <p className="font-game text-2xl text-accent">{formatDuration(solvedElapsedMs)}</p>}
            <p className="text-sm text-ink-soft">
              {state.found.length}/{board.sets.length} sets · {state.misses} {state.misses === 1 ? "miss" : "misses"}
              {state.hints > 0 ? ` · ${state.hints} ${state.hints === 1 ? "hint" : "hints"}` : ""}
            </p>
            <Credits board={board} layout={layout} />
            {onBoardChange && otherLabel && dateKey && otherSolved === false && (
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => onBoardChange(otherKind)}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-surface active:scale-95"
              >
                Play {otherLabel}
              </button>
            )}
            {dateKey && solvedElapsedMs !== null && (
              <ShareButton text={buildShareText(board, state.found.length, state.hints, state.misses, dateKey, solvedElapsedMs)} gameId="typeset" />
            )}
            {isDaily && otherSolved && <DailyOutro gameId="typeset" loadStreak={outroStreak} />}
          </motion.div>
        ) : !state.solved ? (
          <motion.div key="tray" exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="pt-3 [@media(max-height:720px)]:pt-2">
            <FoundTray board={board} layout={layout} found={state.found} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showConfetti && <ConfettiOverlay />}

      {hintWarningOpen && (
        <ModalDialog labelledBy="hint-dialog-title" onClose={() => setHintWarningOpen(false)} className="text-center">
          <div>
            <h2 id="hint-dialog-title" className="text-lg font-bold">
              Use a hint?
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              A hint names one thing about a set you haven’t found. Each one narrows it further, and today’s result will note{" "}
              <span className="font-semibold text-ink">how many hints you used</span>. Streaks are safe.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                data-autofocus
                onClick={() => {
                  setHintWarningOpen(false);
                  takeHint();
                }}
                className="rounded-full bg-accent py-2.5 font-semibold text-surface active:scale-95"
              >
                Use hint
              </button>
              <button type="button" onClick={() => setHintWarningOpen(false)} className="rounded-full border border-line py-2.5 font-semibold active:scale-95">
                Cancel
              </button>
            </div>
          </div>
        </ModalDialog>
      )}

      <AnimatePresence>
        {coachOpen && (
          <CoachSheet
            onClose={() => setCoachOpen(false)}
            tutorialTo={isTutorial ? undefined : "/games/typeset/tutorial"}
            rules={[
              {
                Icon: Type,
                title: board.kind === "faces" ? "Today’s faces" : `Today: ${board.label}`,
                body: <TodayGlyphs board={board} layout={layout} />,
              },
              {
                Icon: Grid3x3,
                title: "Find sets of three",
                body: (
                  <>
                    Tap three cards. Find <Key>every set</Key> on the board to solve it — the board says how many there are.
                  </>
                ),
              },
              {
                Icon: Shapes,
                title: "Four things to compare",
                body: (
                  <>
                    The <Key>character</Key> (or the <Key>face</Key> on the faces board), how <Key>many</Key>, the <Key>color</Key>, and the{" "}
                    <Key>fill</Key>: solid, cross-hatched or open.
                  </>
                ),
              },
              {
                Icon: Equal,
                title: "All same or all different",
                body: (
                  <>
                    Three cards are a set when each of the four is <Key>all the same</Key> or <Key>all different</Key> across them.
                  </>
                ),
              },
              {
                Icon: Layers,
                title: "Two boards",
                body: (
                  <>
                    Each day has a <Key>character set</Key> board and a <Key>faces</Key> board — one letter in three typefaces. Solve{" "}
                    <Key>both</Key> to finish the day.
                  </>
                ),
              },
              {
                Icon: Lightbulb,
                title: "Hints",
                body: (
                  <>
                    A hint names one thing about a set you haven’t found. Wrong guesses are counted, never penalized.
                  </>
                ),
              },
            ]}
          />
        )}
      </AnimatePresence>

      <TutorialPrompt enabled={isDaily} gameId="typeset" gameName="Typeset" loadSeen={loadTutorialSeen} markSeen={markTutorialSeen} />

      <div aria-live="polite" role="status" className="sr-only">
        {toast && <span key={toast.nonce}>{toast.text}</span>}
      </div>
      <div aria-live="polite" className="sr-only">
        {selectionAnnounce}
      </div>
    </div>
  );
}

/**
 * The day's three glyphs, named — the key to the glyph attribute. Lives in
 * the "?" sheet, not on the board: a row of labels between the tabs and the
 * cards read as clutter, and cost the cards their height. Each card's
 * aria-label already names its glyph.
 */
function TodayGlyphs({ board, layout }: { board: Board; layout: GlyphLayout }) {
  return (
    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
      {board.glyphs.map((g, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <Glyph layout={layout} glyph={i as 0 | 1 | 2} ink={0} fill={0} neutral className="inline-block h-5 w-5 shrink-0" />
          <span>{board.kind === "faces" ? `${FACES[g.face].name} (${FACES[g.face].family.toLowerCase()})` : g.name}</span>
        </span>
      ))}
    </span>
  );
}

/** One slot per set on the board; found sets fill in as mini cards. */
function FoundTray({ board, layout, found }: { board: Board; layout: GlyphLayout; found: string[] }) {
  const slots = Array.from({ length: board.sets.length }, (_, i) => found[i] ?? null);
  return (
    <section aria-label={`${found.length} of ${board.sets.length} sets found`} className="grid grid-cols-2 gap-1.5">
      {slots.map((key, i) =>
        key === null ? (
          <div key={i} className="h-9 rounded-lg border border-dashed border-line" />
        ) : (
          <div
            key={i}
            role="img"
            aria-label={key
              .split(",")
              .map((idx) => describeCard(board, board.cards[Number(idx)]))
              .join(", ")}
            className="flex h-9 gap-1 rounded-lg bg-surface-tint p-1"
          >
            {key.split(",").map((idx) => {
              const card = board.cards[Number(idx)];
              return (
                <div key={idx} className="flex flex-1 items-center justify-center rounded-md bg-surface-raised">
                  {Array.from({ length: card[1] + 1 }, (_, n) => (
                    <Glyph key={n} layout={layout} glyph={card[0]} ink={card[2]} fill={card[3]} mini className="h-[22px] w-[15px]" />
                  ))}
                </div>
              );
            })}
          </div>
        ),
      )}
    </section>
  );
}

/** Who made the type, shown once the board is done. */
function Credits({ board, layout }: { board: Board; layout: GlyphLayout }) {
  if (board.kind === "charset") {
    const face = FACES[board.glyphs[0].face];
    return (
      <p className="text-center text-xs text-ink-soft">
        Set in <span className="font-semibold text-ink">{face.name}</span> · {face.designer}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1 text-xs text-ink-soft">
      {board.glyphs.map((g, i) => {
        const face = FACES[g.face];
        return (
          <li key={g.face} className="flex items-center gap-2">
            <Glyph layout={layout} glyph={i as 0 | 1 | 2} ink={0} fill={0} neutral className="h-5 w-5 shrink-0" />
            <span>
              <span className="font-semibold text-ink">{face.name}</span> · {face.family} · {face.designer}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

