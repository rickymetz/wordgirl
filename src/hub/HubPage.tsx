import "@fontsource/rubik-mono-one/latin-400.css";
import { useState } from "react";
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
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
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
