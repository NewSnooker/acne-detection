import type { Metadata } from "next"
import { RegisterForm } from "@/components/auth/register-form"

export const metadata: Metadata = { title: "สมัครสมาชิก" }

export default function RegisterPage() {
  return (
    <div className="rounded-2xl border bg-card p-8 shadow-lg">
      <h2 className="text-xl font-semibold mb-1">สมัครสมาชิก</h2>
      <p className="text-sm text-muted-foreground mb-6">สร้างบัญชีใหม่เพื่อเข้าใช้งานระบบ</p>

      <RegisterForm />
    </div>
  )
}
