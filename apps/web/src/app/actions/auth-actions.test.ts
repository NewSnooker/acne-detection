import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ปุ่มเข้าสู่ระบบในหน้า /login เรียก Server Action ชุดนี้
const { signIn, redirect, AuthError } = vi.hoisted(() => {
  class AuthError extends Error {
    type: string;
    constructor(type: string) {
      super(type);
      this.type = type;
    }
  }
  return {
    signIn: vi.fn(),
    // redirect ของ Next.js หยุดการทำงานด้วยการ throw จึงจำลองแบบเดียวกัน
    redirect: vi.fn((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    }),
    AuthError,
  };
});
vi.mock("@/lib/auth", () => ({ signIn }));
vi.mock("next-auth", () => ({ AuthError }));
vi.mock("next/navigation", () => ({ redirect }));

import { loginWithCredentials, loginWithGoogle } from "./auth-actions";

function form(data: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return fd;
}

beforeEach(() => {
  signIn.mockReset();
  redirect.mockClear();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loginWithCredentials", () => {
  it("ข้อมูลถูกต้อง เรียก signIn แบบ credentials และตอบ success", async () => {
    signIn.mockResolvedValue(undefined);

    const result = await loginWithCredentials(form({ email: "a@b.com", password: "Admin1234" }));

    expect(result).toEqual({ success: true });
    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "a@b.com",
      password: "Admin1234",
      redirect: false,
    });
  });

  it("อีเมลหรือรหัสผ่านผิด ตอบข้อความภาษาไทย", async () => {
    signIn.mockRejectedValue(new AuthError("CredentialsSignin"));

    const result = await loginWithCredentials(form({ email: "a@b.com", password: "wrong" }));

    expect(result).toEqual({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
  });

  it("error ชนิดอื่นของระบบเข้าสู่ระบบ ตอบข้อความทั่วไป", async () => {
    signIn.mockRejectedValue(new AuthError("CallbackRouteError"));

    const result = await loginWithCredentials(form({ email: "a@b.com", password: "x" }));

    expect(result).toEqual({ error: "เกิดข้อผิดพลาดบางอย่าง" });
  });

  it("กรอกไม่ครบหรืออีเมลผิดรูปแบบ ไม่เรียก signIn", async () => {
    expect(await loginWithCredentials(form({ email: "not-an-email", password: "x" }))).toEqual({
      error: "ข้อมูลไม่ถูกต้อง",
    });
    expect(await loginWithCredentials(form({ email: "a@b.com", password: "" }))).toEqual({
      error: "ข้อมูลไม่ถูกต้อง",
    });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("error ที่ไม่เกี่ยวกับการเข้าสู่ระบบ (เช่น ฐานข้อมูลล่ม) ถูกโยนต่อ ไม่กลืนทิ้ง", async () => {
    signIn.mockRejectedValue(new Error("db down"));

    await expect(loginWithCredentials(form({ email: "a@b.com", password: "x" }))).rejects.toThrow("db down");
  });
});

describe("loginWithGoogle", () => {
  it("ยังไม่ได้ตั้งค่า Google พากลับหน้า login พร้อมรหัสแจ้งเตือน และไม่เรียก signIn", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");

    await expect(loginWithGoogle()).rejects.toThrow("REDIRECT:/login?error=GoogleNotConfigured");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("ตั้งค่า Google ครบ เรียก signIn แบบ google แล้วไปหน้า /analyze", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    signIn.mockResolvedValue(undefined);

    await loginWithGoogle();

    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/analyze" });
    expect(redirect).not.toHaveBeenCalled();
  });
});
