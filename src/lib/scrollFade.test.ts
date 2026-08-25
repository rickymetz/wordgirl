import { describe, expect, it } from "vitest";
import { edgeFade } from "./scrollFade";

describe("edgeFade", () => {
  it("fades nothing when the content fits", () => {
    expect(edgeFade(0, 300, 300)).toBe("none");
    expect(edgeFade(0, 301, 300)).toBe("none"); // within the 1px slack
  });

  it("fades only the right edge at the start", () => {
    expect(edgeFade(0, 600, 300)).toBe("right");
    expect(edgeFade(1, 600, 300)).toBe("right"); // 1px slack still counts as start
  });

  it("fades only the left edge at the end", () => {
    expect(edgeFade(300, 600, 300)).toBe("left");
    expect(edgeFade(299, 600, 300)).toBe("left"); // within 1px of the end
  });

  it("fades both edges in the middle", () => {
    expect(edgeFade(150, 600, 300)).toBe("both");
  });
});
