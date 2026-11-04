import { describe, expect, it } from "vitest";
import { createStepTimer } from "./step-timer";

describe("createStepTimer", () => {
  it("นับเวลาแต่ละขั้นจากขั้นก่อนหน้า และ total จากตอนเริ่ม", () => {
    const times = [1000, 1150, 1450, 3900];
    const timer = createStepTimer(() => times.shift() ?? 0);
    timer.mark("auth");
    timer.mark("upload azure-blob");
    expect(timer.summary()).toBe(
      "auth 0.15s | upload azure-blob 0.30s | total 2.90s",
    );
  });

  it("ยังไม่ mark ขั้นไหนเลย มีแค่ total", () => {
    const times = [0, 20];
    const timer = createStepTimer(() => times.shift() ?? 0);
    expect(timer.summary()).toBe("total 0.02s");
  });
});
