import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default function RegisterPage() {
  return (
    <div className="bg-card rounded-2xl border p-8 shadow-lg">
      <h2 className="mb-1 text-xl font-semibold">สมัครสมาชิก</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        สร้างบัญชีใหม่เพื่อเข้าใช้งานระบบ
      </p>

      <RegisterForm />
    </div>
  );
}
