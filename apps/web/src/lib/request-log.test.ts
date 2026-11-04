import { describe, expect, it } from "vitest";
import {
  createStepTimer,
  describeAiGap,
  parseServerTiming,
  requestIdFrom,
} from "./request-log";

const clock =
  (...times: number[]) =>
  () =>
    times.shift() ?? 0;

describe("createStepTimer", () => {
  it("นับเวลาแต่ละขั้น และ total จากตอนเริ่ม", () => {
    // start, step auth, step upload (ปิด auth), done (ปิด upload), summary
    const timer = createStepTimer(clock(1000, 1000, 1150, 1450, 3900));
    timer.step("auth");
    timer.step("upload azure-blob");
    timer.done();
    expect(timer.summary()).toBe(
      "auth 0.15s | upload azure-blob 0.30s | total 2.90s",
    );
  });

  it("note ต่อท้ายขั้นที่กำลังทำ", () => {
    const timer = createStepTimer(clock(0, 0, 2400, 2400));
    timer.step("ai request");
    timer.note("ai: total 1.91s");
    timer.done();
    expect(timer.summary()).toBe(
      "ai request 2.40s (ai: total 1.91s) | total 2.40s",
    );
  });

  it("current = ขั้นที่ยังไม่จบ (ใช้บอกขั้นที่พัง)", () => {
    const timer = createStepTimer(clock(0, 0, 10));
    timer.step("auth");
    timer.step("read form");
    expect(timer.current()).toBe("read form");
  });

  it("Server-Timing ใช้ ms และชื่อไม่มีช่องว่าง", () => {
    // start, step, done, serverTiming total
    const timer = createStepTimer(clock(0, 0, 50, 100));
    timer.step("find model");
    timer.done();
    timer.addServerTiming([{ name: "ai-inference", ms: 30 }]);
    expect(timer.serverTiming()).toBe(
      "find-model;dur=50, ai-inference;dur=30, total;dur=100",
    );
  });
});

describe("parseServerTiming", () => {
  it("อ่าน name;dur= หลายตัว", () => {
    expect(
      parseServerTiming("image;dur=40, model;dur=0, total;dur=1910"),
    ).toEqual([
      { name: "image", ms: 40 },
      { name: "model", ms: 0 },
      { name: "total", ms: 1910 },
    ]);
  });

  it("ไม่มี header หรือไม่มี dur → ข้าม", () => {
    expect(parseServerTiming(null)).toEqual([]);
    expect(parseServerTiming("cache;desc=hit")).toEqual([]);
  });
});

describe("describeAiGap", () => {
  it("บอกเวลาที่หายไประหว่างเว็บกับ ai", () => {
    expect(
      describeAiGap(
        [
          { name: "inference", ms: 1870 },
          { name: "total", ms: 1910 },
        ],
        2400,
      ),
    ).toBe("network/wake 0.49s");
  });

  it("ai ไม่ส่ง total มา → null", () => {
    expect(describeAiGap([], 2400)).toBeNull();
  });
});

describe("requestIdFrom", () => {
  it("ใช้ x-request-id ที่ส่งมาถ้ารูปแบบถูก", () => {
    expect(requestIdFrom(new Headers({ "x-request-id": "abc-123" }))).toBe(
      "abc-123",
    );
  });

  it("ค่าแปลกหรือไม่มี → สร้างใหม่ 16 ตัว", () => {
    expect(requestIdFrom(new Headers({ "x-request-id": "a b" }))).toHaveLength(
      16,
    );
    expect(requestIdFrom(new Headers())).toHaveLength(16);
  });
});
