import { useEffect, useState } from "react";

export function useStorageBroken() {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    const onError = () => setBroken(true);
    window.addEventListener("wg:storage-error", onError);
    return () => window.removeEventListener("wg:storage-error", onError);
  }, []);
  return broken;
}
