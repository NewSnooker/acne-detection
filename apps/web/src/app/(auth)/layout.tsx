import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <span className="text-3xl">🔬</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">AcneAI</h1>
          <p className="text-sm text-muted-foreground mt-1">วิเคราะห์สิวด้วย AI</p>
        </div>
        {children}
      </div>
    </div>
  )
}
