import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { applySettings, loadSettings } from "./lib/settings";
import { setSWRegistration } from "./lib/swUpdate";
import "./index.css";

// Theme override + text size must land before first paint.
applySettings(loadSettings());

// Ask the browser not to evict our storage — streak history lives here.
if (navigator.storage?.persist) {
  void navigator.storage.persist().catch(() => {});
}

// Proper SW lifecycle: check for a new build hourly and whenever the
// app returns to the foreground, so updates land on the next launch
// instead of two launches later.
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    setSWRegistration(registration); // Settings' "Check for updates"
    setInterval(() => void registration.update(), 60 * 60 * 1000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) void registration.update();
    });
  },
});
void updateSW;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
