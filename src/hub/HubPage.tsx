import "@fontsource/rubik-mono-one/latin-400.css";
import { useState } from "react";
import { Settings } from "lucide-react";
import { games } from "../games/registry";
import { SettingsDialog } from "../components/SettingsDialog";
import { GameCard } from "./GameCard";

export function HubPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-12">
      <header className="relative pt-12 pb-8">
        {/* Display font sets the brand apart from the UI text. */}
        <h1 className="text-center font-game text-2xl">WordGirl</h1>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="settings"
          className="absolute top-12 right-0 -m-2 flex h-10 w-10 items-center justify-center rounded-full p-2 text-ink-soft active:scale-90"
        >
          <Settings aria-hidden className="h-5 w-5" />
        </button>
      </header>
      <main className="flex flex-col gap-5">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </main>
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
