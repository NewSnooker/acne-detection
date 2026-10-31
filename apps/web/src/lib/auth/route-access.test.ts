import { describe, expect, it } from "vitest";
import { resolveRedirect } from "./route-access";

// กติกากันหน้าเว็บใน proxy.ts — คืน path ที่ถูกพาไป หรือ null ถ้าเข้าได้
const GUEST = null;
const USER = { role: "USER" };
const ADMIN = { role: "ADMIN" };

describe("resolveRedirect", () => {
  describe("ยังไม่เข้าสู่ระบบ", () => {
    it.each([
      "/analyze",
      "/history",
      "/statistics",
      "/admin/users",
      "/knowledge/x",
      "/api/analyze",
      "/api/images/a.jpg",
      "/api/users",
    ])("เข้า %s ถูกพาไปหน้า /login", (path) => {
      expect(resolveRedirect(path, GUEST)).toBe("/login");
    });

    it.each([
      "/",
      "/login",
      "/register",
      "/api/auth/callback/google",
      "/api/account/register",
    ])("เข้า %s ได้โดยไม่ต้องเข้าสู่ระบบ", (path) => {
      expect(resolveRedirect(path, GUEST)).toBeNull();
    });

    it("บริการ AI โหลดไฟล์โมเดลผ่าน /api/models/<id> ได้ (route ตรวจ X-API-Key เอง)", () => {
      expect(
        resolveRedirect("/api/models/64a000000000000000000001", GUEST),
      ).toBeNull();
    });
  });

  describe("ผู้ใช้ทั่วไป", () => {
    it.each(["/analyze", "/history", "/statistics", "/api/analyze"])(
      "เข้า %s ได้",
      (path) => {
        expect(resolveRedirect(path, USER)).toBeNull();
      },
    );

    it.each([
      "/admin/users",
      "/admin/models",
      "/admin/history",
      "/admin/statistics",
    ])("เข้า %s ไม่ได้ ถูกพากลับไป /analyze", (path) => {
      expect(resolveRedirect(path, USER)).toBe("/analyze");
    });

    it("เข้าสู่ระบบแล้วเปิดหน้า /login ถูกพาไป /analyze", () => {
      expect(resolveRedirect("/login", USER)).toBe("/analyze");
    });
  });

  describe("ผู้ดูแลระบบ", () => {
    it.each([
      "/analyze",
      "/admin/users",
      "/admin/models",
      "/admin/history",
      "/admin/statistics",
    ])("เข้า %s ได้", (path) => {
      expect(resolveRedirect(path, ADMIN)).toBeNull();
    });
  });

  it("session ที่ไม่มี role ถือว่าไม่ใช่ผู้ดูแลระบบ", () => {
    expect(resolveRedirect("/admin/users", {})).toBe("/analyze");
  });
});
