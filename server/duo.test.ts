import { describe, expect, it } from "vitest";
import { getDayKeys } from "./db.js";

describe("DuoDay history", () => {
  it("returns an ordered 28-day window ending on the selected day", () => {
    const days = getDayKeys("2026-09-17");
    expect(days).toHaveLength(28);
    expect(days[0]).toBe("2026-08-21");
    expect(days.at(-1)).toBe("2026-09-17");
    expect(days.every((day, index) => index === 0 || day > days[index - 1]!)).toBe(true);
  });

  it("updates task title correctly", async () => {
    const { addTask, updateTask, getTasks } = await import("./db.js");
    const taskId = await addTask(999, 1, "Initial task title");
    await updateTask(999, taskId, "Edited task title");
    const tasks = await getTasks(999);
    const updated = tasks.find(t => t.id === taskId);
    expect(updated?.title).toBe("Edited task title");
  });
});


