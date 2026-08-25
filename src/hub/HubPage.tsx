import "@fontsource/rubik-mono-one/latin-400.css";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { BookOpen, Settings } from "lucide-react";
import { games } from "../games/registry";
import { SettingsDialog } from "../components/SettingsDialog";
import { GameCard } from "./GameCard";
import { BackupPrompt } from "../components/BackupPrompt";
import { DailyRoundup } from "../components/game/DailyRoundup";
import { useToday } from "../lib/useToday";

export function HubPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const today = useToday();
  return (
    <div className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-12 md:max-w-2xl">
      <header className="relative pt-12 pb-8">
        {/* Display font sets the brand apart from the UI text. */}
        <h1 className="text-center font-game text-2xl md:text-3xl">WordGirl</h1>
        <Link
          to="/dictionary"
          aria-label="dictionary"
          className="absolute top-12 left-0 -m-2 flex h-10 w-10 items-center justify-center rounded-full p-2 text-ink-soft active:scale-90 after:absolute after:-inset-0.5"
        >
          <BookOpen aria-hidden className="h-5 w-5" />
        </Link>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="settings"
          className="absolute top-12 right-0 -m-2 flex h-10 w-10 items-center justify-center rounded-full p-2 text-ink-soft active:scale-90 after:absolute after:-inset-0.5"
        >
          <Settings aria-hidden className="h-5 w-5" />
        </button>
      </header>
      <main className="flex flex-col gap-5 md:gap-8">
        {/* Self-hides until every puzzle is done — the day's shareable
            summary, sitting above the cards it sums up. */}
        <DailyRoundup today={today} />
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </main>
      <BackupPrompt />
      {/* The only route into the legal pages. Kept off the game screens
          on purpose — they are the one place with a height budget, and a
          link nobody needs mid-puzzle is not worth spending it on. */}
      {/* `-my-3 py-3` is the touch floor, not decoration: the labels are
          20px of line box, and the padding lifts the tap target to 44
          while the negative margin keeps the footer the height it looks. */}
      <footer className="flex justify-center gap-6 pt-10 text-sm text-ink-soft">
        <Link
          to="/privacy"
          className="-my-3 py-3 underline underline-offset-2"
        >
          Privacy
        </Link>
        <Link to="/terms" className="-my-3 py-3 underline underline-offset-2">
          Terms
        </Link>
      </footer>
      <AnimatePresence>
        {settingsOpen && (
          <SettingsDialog onClose={() => setSettingsOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
