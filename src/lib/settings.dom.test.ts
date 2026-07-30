import { beforeEach, describe, expect, it } from "vitest";
import { loadSettings, saveSettings, applySettings } from "./settings";

const KEY = "wg:v1:local:settings";
const root = document.documentElement;

beforeEach(() => {
  localStorage.clear();
  delete root.dataset.theme;
  delete root.dataset.font;
  root.style.fontSize = "";
});

describe("the Font setting", () => {
  it("defaults to the house faces, with no attribute to override them", () => {
    expect(loadSettings().font).toBe("default");
    applySettings(loadSettings());
    // Absent, not "default": the CSS keys off html[data-font="accessible"],
    // so an attribute with any other value would be dead weight.
    expect(root.dataset.font).toBeUndefined();
  });

  it("marks the root when Accessible is chosen, and unmarks it on the way back", () => {
    saveSettings({ theme: "system", fontScale: 100, font: "accessible" });
    expect(root.dataset.font).toBe("accessible");
    saveSettings({ theme: "system", fontScale: 100, font: "default" });
    expect(root.dataset.font).toBeUndefined();
  });

  it("round-trips through storage", () => {
    saveSettings({ theme: "dark", fontScale: 125, font: "accessible" });
    expect(loadSettings()).toEqual({
      theme: "dark",
      fontScale: 125,
      font: "accessible",
    });
  });

  it("reads a save written before the setting existed as Default", () => {
    // Every save on a player's device right now looks like this.
    localStorage.setItem(KEY, JSON.stringify({ theme: "dark", fontScale: 125 }));
    const loaded = loadSettings();
    expect(loaded.font).toBe("default");
    // ...and the settings that DID exist survive the upgrade.
    expect(loaded.theme).toBe("dark");
    expect(loaded.fontScale).toBe(125);
  });

  it("falls back to Default for a value it does not recognise", () => {
    localStorage.setItem(KEY, JSON.stringify({ font: "lexend-giga" }));
    expect(loadSettings().font).toBe("default");
  });

  it("is independent of theme and text size", () => {
    // Three separate controls: picking a face must not disturb the others.
    saveSettings({ theme: "light", fontScale: 87.5, font: "accessible" });
    expect(root.dataset.theme).toBe("light");
    expect(root.style.fontSize).toBe("87.5%");
    expect(root.dataset.font).toBe("accessible");
  });
});
