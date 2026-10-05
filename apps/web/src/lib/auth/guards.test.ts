import { beforeEach, describe, expect, it, vi } from "vitest";

// จุดตรวจสิทธิ์กลาง ที่ทุกหน้าและทุก API ใช้ (ขอบเขตข้อ 1.3.1 ผู้ดูแลระบบ / 1.3.2 ผู้ใช้ทั่วไป)
const { auth, redirect } = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("next/navigation", () => ({ redirect }));

import { requireAdminApi, requireAdminPage, requireUserApi, requireUserPage } from "./guards";

const USER = { user: { id: "u1", role: "USER" } };
const ADMIN = { user: { id: "a1", role: "ADMIN" } };

beforeEach(() => {
  auth.mockReset();
});

describe("API", () => {
  it("requireUserApi: ยังไม่เข้าสู่ระบบ ตอบ 401", async () => {
    auth.mockResolvedValue(null);

    const guard = await requireUserApi();

    expect(guard.ok).toBe(false);
    if (!guard.ok) {
      expect(guard.response.status).toBe(401);
      expect(await guard.response.json()).toEqual({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" });
    }
  });

  it("requireUserApi: session ไม่มี id ผู้ใช้ ตอบ 401", async () => {
    auth.mockResolvedValue({ user: { role: "USER" } });

    const guard = await requireUserApi();

    expect(guard.ok).toBe(false);
  });

  it("requireUserApi: ผู้ใช้ทั่วไปผ่าน และได้ session กลับมา", async () => {
    auth.mockResolvedValue(USER);

    const guard = await requireUserApi();

    expect(guard).toEqual({ ok: true, session: USER });
  });

  it("requireAdminApi: ยังไม่เข้าสู่ระบบ ตอบ 401", async () => {
    auth.mockResolvedValue(null);

    const guard = await requireAdminApi();

    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(401);
  });

  it("requireAdminApi: ผู้ใช้ทั่วไป ตอบ 403", async () => {
    auth.mockResolvedValue(USER);

    const guard = await requireAdminApi();

    expect(guard.ok).toBe(false);
    if (!guard.ok) {
      expect(guard.response.status).toBe(403);
      expect(await guard.response.json()).toEqual({ error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
    }
  });

  it("requireAdminApi: ผู้ดูแลระบบผ่าน", async () => {
    auth.mockResolvedValue(ADMIN);

    expect(await requireAdminApi()).toEqual({ ok: true, session: ADMIN });
  });
});

describe("หน้าเว็บ", () => {
  it("requireUserPage: ยังไม่เข้าสู่ระบบ ถูกพาไป /login", async () => {
    auth.mockResolvedValue(null);

    await expect(requireUserPage()).rejects.toThrow("REDIRECT:/login");
  });

  it("requireUserPage: เข้าสู่ระบบแล้ว ได้ session", async () => {
    auth.mockResolvedValue(USER);

    expect(await requireUserPage()).toBe(USER);
  });

  it("requireAdminPage: ยังไม่เข้าสู่ระบบ ถูกพาไป /login", async () => {
    auth.mockResolvedValue(null);

    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/login");
  });

  it("requireAdminPage: ผู้ใช้ทั่วไป ถูกพาไป /analyze", async () => {
    auth.mockResolvedValue(USER);

    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/analyze");
  });

  it("requireAdminPage: ผู้ดูแลระบบ ได้ session", async () => {
    auth.mockResolvedValue(ADMIN);

    expect(await requireAdminPage()).toBe(ADMIN);
  });
});
