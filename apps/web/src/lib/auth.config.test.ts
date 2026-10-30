import { describe, expect, it } from "vitest";
import { authConfig } from "./auth.config";

// สิทธิ์ (role) ต้องติดไปกับ session หลังเข้าสู่ระบบ เพราะทุกจุดตรวจสิทธิ์อ่านจาก session
const { jwt, session } = authConfig.callbacks;

describe("authConfig.callbacks", () => {
  it("ตอนเข้าสู่ระบบ เก็บ id และ role ของผู้ใช้ลง token", async () => {
    const token = await jwt({
      token: {},
      user: { id: "u1", role: "ADMIN" },
    } as any);

    expect(token).toMatchObject({ id: "u1", role: "ADMIN" });
  });

  it("คำขอครั้งถัดไป (ไม่มี user) token เดิมไม่ถูกแก้", async () => {
    const token = await jwt({ token: { id: "u1", role: "USER" } } as any);

    expect(token).toEqual({ id: "u1", role: "USER" });
  });

  it("session ได้ id และ role จาก token", async () => {
    const result = await session({
      session: { user: { email: "a@b.c" }, expires: "" },
      token: { id: "u1", role: "ADMIN" },
    } as any);

    expect(result.user).toMatchObject({
      id: "u1",
      role: "ADMIN",
      email: "a@b.c",
    });
  });

  it("หน้าเข้าสู่ระบบและหน้า error ชี้ไปที่ /login", () => {
    expect(authConfig.pages).toEqual({ signIn: "/login", error: "/login" });
  });
});
