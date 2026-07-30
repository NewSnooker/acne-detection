import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = { title: "เข้าสู่ระบบ" }

export default function LoginPage() {
  return (
    <div className="rounded-2xl border bg-card p-8 shadow-lg">
      <h2 className="text-xl font-semibold mb-1">เข้าสู่ระบบ</h2>
      <p className="text-sm text-muted-foreground mb-6">กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>

      <LoginForm />
    </div>
  )
}
