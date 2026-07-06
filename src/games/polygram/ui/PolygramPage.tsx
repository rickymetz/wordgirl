import { useEffect, useState } from "react";
import { localDateKey } from "../../../lib/date";
import { GameScreen } from "./GameScreen";

export default function PolygramPage() {
  // The mounted date. Crossing midnight with the app open (or resuming
  // an iOS PWA on a new day) must remount onto the new puzzle — playing
  // on with a stale board would save yesterday's progress under today's
  // key.
  const [dateKey, setDateKey] = useState(() => localDateKey());

  useEffect(() => {
    const check = () => {
      const now = localDateKey();
      if (now !== dateKey) setDateKey(now);
    };
    document.addEventListener("visibilitychange", check);
    const timer = setInterval(check, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", check);
      clearInterval(timer);
    };
  }, [dateKey]);

  return <GameScreen key={dateKey} mode={{ kind: "daily", dateKey }} />;
}
