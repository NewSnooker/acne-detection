import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

// สมัครสมาชิก — จำลองฐานข้อมูล
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), create: vi.fn(), count: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { registerUserLogic } from "./auth";

const valid = {
  name: "ผู้ใช้ทดสอบ",
  email: "new@example.com",
  password: "Passw0rd1",
  confirmPassword: "Passw0rd1",
};

beforeEach(() => {
  Object.values(db.user).forEach((fn) => fn.mockReset());
  db.user.findUnique.mockResolvedValue(null);
  db.user.count.mockResolvedValue(5);
  db.user.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: "new",
      ...data,
    }),
  );
});

describe("registerUserLogic", () => {
  it("ข้อมูลถูกต้อง สร้างบัญชีใหม่", async () => {
    const user = await registerUserLogic(valid);

    expect(user).toMatchObject({
      name: "ผู้ใช้ทดสอบ",
      email: "new@example.com",
    });
    expect(db.user.create).toHaveBeenCalledTimes(1);
  });

  it("รหัสผ่านถูกเข้ารหัสก่อนบันทึก ไม่เก็บรหัสผ่านจริง", async () => {
    await registerUserLogic(valid);

    const saved = db.user.create.mock.calls[0][0].data.password as string;
    expect(saved).not.toBe(valid.password);
    expect(await bcrypt.compare(valid.password, saved)).toBe(true);
  });

  it("อีเมลซ้ำ สมัครไม่ได้", async () => {
    db.user.findUnique.mockResolvedValue({ id: "old", email: valid.email });

    await expect(registerUserLogic(valid)).rejects.toThrow(
      "อีเมลนี้ถูกใช้งานแล้ว",
    );
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("ผู้ที่สมัครทีหลังได้สิทธิ์ผู้ใช้ทั่วไป (USER)", async () => {
    db.user.count.mockResolvedValue(3);

    expect((await registerUserLogic(valid)).role).toBe("USER");
  });

  it("ระบบที่ยังไม่มีผู้ใช้เลย คนแรกที่สมัครเป็นผู้ดูแลระบบ (ADMIN)", async () => {
    db.user.count.mockResolvedValue(0);

    expect((await registerUserLogic(valid)).role).toBe("ADMIN");
  });

  it.each([
    ["รหัสผ่านสั้นกว่า 8 ตัว", { password: "Pass1", confirmPassword: "Pass1" }],
    [
      "รหัสผ่านไม่มีตัวเลข",
      { password: "Password", confirmPassword: "Password" },
    ],
    ["รหัสผ่านยืนยันไม่ตรงกัน", { confirmPassword: "Passw0rd2" }],
    ["อีเมลผิดรูปแบบ", { email: "not-an-email" }],
    ["ชื่อสั้นกว่า 5 ตัว", { name: "abc" }],
  ])("%s สมัครไม่ได้ และไม่แตะฐานข้อมูล", async (_name, override) => {
    await expect(registerUserLogic({ ...valid, ...override })).rejects.toThrow(
      "ข้อมูลไม่ถูกต้อง",
    );
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("ส่ง role มาเองในคำขอ ไม่ทำให้ได้สิทธิ์ผู้ดูแลระบบ", async () => {
    const user = await registerUserLogic({ ...valid, role: "ADMIN" });

    expect(user.role).toBe("USER");
  });
});
