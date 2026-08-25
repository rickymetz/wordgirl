import { afterEach, describe, expect, it } from "vitest";
import { applyLowPowerFlag, isLowPowerDevice } from "./lowPower";

type FakeNav = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};
const nav = (over: Partial<FakeNav>): FakeNav => over as FakeNav;

describe("isLowPowerDevice", () => {
  it("honours an explicit Save-Data request", () => {
    expect(isLowPowerDevice(nav({ connection: { saveData: true } }))).toBe(true);
  });
  it("flags a budget device by low reported memory", () => {
    expect(isLowPowerDevice(nav({ deviceMemory: 2 }))).toBe(true);
    expect(isLowPowerDevice(nav({ deviceMemory: 4 }))).toBe(true);
  });
  it("leaves a capable device alone", () => {
    expect(isLowPowerDevice(nav({ deviceMemory: 8 }))).toBe(false);
  });
  it("assumes capable when the platform reports nothing (Safari/Firefox)", () => {
    expect(isLowPowerDevice(nav({}))).toBe(false);
    expect(isLowPowerDevice(nav({ connection: { saveData: false } }))).toBe(false);
  });
});

describe("applyLowPowerFlag", () => {
  const saved = Object.getOwnPropertyDescriptor(navigator, "deviceMemory");
  afterEach(() => {
    if (saved) Object.defineProperty(navigator, "deviceMemory", saved);
    else delete (navigator as { deviceMemory?: number }).deviceMemory;
  });

  it("stamps the root on a low-power device and clears it otherwise", () => {
    const root = document.createElement("html");
    Object.defineProperty(navigator, "deviceMemory", {
      value: 2,
      configurable: true,
    });
    applyLowPowerFlag(root);
    expect(root.dataset.lowPower).toBe("true");

    Object.defineProperty(navigator, "deviceMemory", {
      value: 8,
      configurable: true,
    });
    applyLowPowerFlag(root);
    expect(root.dataset.lowPower).toBeUndefined();
  });
});
