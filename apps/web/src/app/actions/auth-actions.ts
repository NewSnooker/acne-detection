"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { loginSchema } from "@/schemas/auth";
import { isGoogleEnabled } from "@/lib/auth/google";
import { redirect } from "next/navigation";

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
  // ยังไม่ได้ตั้งค่า Google OAuth → กลับไปหน้า login พร้อมข้อความแจ้ง
  if (!isGoogleEnabled()) {
    redirect("/login?error=GoogleNotConfigured");
  }
  await signIn("google", { redirectTo: "/analyze" });
}
