import { describe, expect, it } from "vitest";
import { getDayKeys } from "./db";

describe("DuoDay history", () => {
  it("returns an ordered 28-day window ending on the selected day", () => {
    const days = getDayKeys("2026-09-17");
    expect(days).toHaveLength(28);
    expect(days[0]).toBe("2026-08-21");
    expect(days.at(-1)).toBe("2026-09-17");
    expect(days.every((day, index) => index === 0 || day > days[index - 1]!)).toBe(true);
  });
});
