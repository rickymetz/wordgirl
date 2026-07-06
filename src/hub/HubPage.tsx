import "@fontsource/rubik-mono-one/latin-400.css";
import { games } from "../games/registry";
import { GameCard } from "./GameCard";

export function HubPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-12">
      <header className="pt-12 pb-8">
        {/* Display font sets the brand apart from the UI text. */}
        <h1 className="text-center font-game text-2xl">WordGirl</h1>
      </header>
      <main className="flex flex-col gap-5">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </main>
    </div>
  );
}
