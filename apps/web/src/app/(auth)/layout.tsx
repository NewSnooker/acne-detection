import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="from-background via-accent/20 to-background flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="bg-primary/10 mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl">
            <span className="text-3xl">🔬</span>
          </div>
          <h1 className="text-foreground text-2xl font-bold">AcneAI</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            วิเคราะห์สิวด้วย AI
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
