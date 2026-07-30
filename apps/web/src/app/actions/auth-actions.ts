"use server"

import { signIn } from "@/lib/auth"
import { AuthError } from "next-auth"
import { loginSchema } from "@/schemas/auth"

export async function loginWithCredentials(formData: FormData) {
  const data = Object.fromEntries(formData.entries())
  const parsed = loginSchema.safeParse(data)
  
  if (!parsed.success) {
    return { error: "ข้อมูลไม่ถูกต้อง" }
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    })
    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }
        default:
          return { error: "เกิดข้อผิดพลาดบางอย่าง" }
      }
    }
    throw error // Required for Next.js redirect to work if redirect:true is used
  }
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/analyze" })
}
