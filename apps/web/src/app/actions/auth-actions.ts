"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { loginSchema } from "@/schemas/auth";
import { registerUserLogic } from "@/lib/services/auth-logic";

/**
 * Login ด้วย Credentials — ต้องเป็น Server Action เพื่อให้ NextAuth set session cookie ได้
 */
export async function loginWithCredentials(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const parsed = loginSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "ข้อมูลไม่ถูกต้อง" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
        default:
          return { error: "เกิดข้อผิดพลาดบางอย่าง" };
      }
    }
    throw error;
  }
}

/**
 * Login ด้วย Google — Redirect ไป Google OAuth
 */
export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/analyze" });
}

/**
 * สมัครสมาชิก — ใช้ Logic ที่แยกไว้ใน auth-logic.ts
 * (ทำผ่าน API /api/account/register ก็ได้ แต่ Server Action ก็โอเค)
 */
export async function registerUser(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  try {
    await registerUserLogic(data);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก" };
  }
}
