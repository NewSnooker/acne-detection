import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"
import { isGoogleEnabled } from "@/lib/auth/google"

export const metadata: Metadata = { title: "เข้าสู่ระบบ" }

// ต้องเรนเดอร์ตอนมีคำขอจริง เพื่ออ่านค่า env ของ Google ตอนรัน (ไม่ใช่ตอน build)
export const dynamic = "force-dynamic"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string }>
}) {
  const { error, registered } = await searchParams

  return (
    <div className="rounded-2xl border bg-card p-8 shadow-lg">
      <h2 className="text-xl font-semibold mb-1">เข้าสู่ระบบ</h2>
      <p className="text-sm text-muted-foreground mb-6">กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>

      <LoginForm
        googleEnabled={isGoogleEnabled()}
        errorCode={error}
        registered={registered === "true"}
      />
    </div>
  )
}
