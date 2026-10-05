import { afterEach, describe, expect, it, vi } from "vitest";
import { isGoogleEnabled } from "./google";

// เข้าสู่ระบบด้วย Google (ขอบเขตข้อ 1.3.1.2 / 1.3.2.2) — เปิดใช้เมื่อตั้งค่าครบเท่านั้น
describe("isGoogleEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ตั้งค่าครบทั้งสองตัว เปิดใช้งาน", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    expect(isGoogleEnabled()).toBe(true);
  });

  it("ไม่ได้ตั้งค่าเลย ปิดใช้งาน", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect(isGoogleEnabled()).toBe(false);
  });

  it("มีแต่ GOOGLE_CLIENT_ID ปิดใช้งาน", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect(isGoogleEnabled()).toBe(false);
  });

  it("มีแต่ GOOGLE_CLIENT_SECRET ปิดใช้งาน", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    expect(isGoogleEnabled()).toBe(false);
  });
});
