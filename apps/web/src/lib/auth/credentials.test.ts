import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

// เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน (ขอบเขตข้อ 1.3.1.1 / 1.3.2.1)
// จำลองฐานข้อมูล ไม่ต้องเปิด MongoDB
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique } } }));

import { authorizeCredentials } from "./credentials";

const PASSWORD = "Admin1234";
const dbUser = {
  id: "u1",
  email: "user@example.com",
  name: "ผู้ใช้ทดสอบ",
  image: null,
  role: "USER",
  password: bcrypt.hashSync(PASSWORD, 4),
};

describe("authorizeCredentials", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("อีเมลและรหัสผ่านถูกต้อง คืนข้อมูลผู้ใช้พร้อมสิทธิ์", async () => {
    findUnique.mockResolvedValue(dbUser);

    const result = await authorizeCredentials({
      email: dbUser.email,
      password: PASSWORD,
    });

    expect(result).toEqual({
      id: "u1",
      email: "user@example.com",
      name: "ผู้ใช้ทดสอบ",
      image: null,
      role: "USER",
    });
    expect(findUnique).toHaveBeenCalledWith({ where: { email: dbUser.email } });
  });

  it("ไม่ส่งรหัสผ่าน (ที่เข้ารหัสแล้ว) ออกไปกับข้อมูลผู้ใช้", async () => {
    findUnique.mockResolvedValue(dbUser);

    const result = await authorizeCredentials({
      email: dbUser.email,
      password: PASSWORD,
    });

    expect(result).not.toHaveProperty("password");
  });

  it("ผู้ดูแลระบบเข้าได้และได้สิทธิ์ ADMIN", async () => {
    findUnique.mockResolvedValue({ ...dbUser, role: "ADMIN" });

    const result = await authorizeCredentials({
      email: dbUser.email,
      password: PASSWORD,
    });

    expect(result?.role).toBe("ADMIN");
  });

  it("รหัสผ่านผิด เข้าไม่ได้", async () => {
    findUnique.mockResolvedValue(dbUser);

    expect(
      await authorizeCredentials({
        email: dbUser.email,
        password: "Wrong1234",
      }),
    ).toBeNull();
  });

  it("ไม่มีอีเมลนี้ในระบบ เข้าไม่ได้", async () => {
    findUnique.mockResolvedValue(null);

    expect(
      await authorizeCredentials({
        email: "nobody@example.com",
        password: PASSWORD,
      }),
    ).toBeNull();
  });

  it("บัญชีที่สมัครด้วย Google (ไม่มีรหัสผ่าน) เข้าด้วยรหัสผ่านไม่ได้", async () => {
    findUnique.mockResolvedValue({ ...dbUser, password: null });

    expect(
      await authorizeCredentials({ email: dbUser.email, password: PASSWORD }),
    ).toBeNull();
  });

  it.each([
    ["ไม่กรอกอีเมล", { email: "", password: PASSWORD }],
    ["ไม่กรอกรหัสผ่าน", { email: dbUser.email, password: "" }],
    ["อีเมลผิดรูปแบบ", { email: "not-an-email", password: PASSWORD }],
    ["ไม่ส่งข้อมูลมาเลย", undefined],
  ])("%s เข้าไม่ได้ และไม่ไปค้นฐานข้อมูล", async (_name, input) => {
    expect(await authorizeCredentials(input)).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
