import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { loginSchema } from "@/schemas/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
        default:
          return NextResponse.json({ error: "เกิดข้อผิดพลาดบางอย่าง" }, { status: 500 });
      }
    }
    // สำหรับ Next.js redirect errors ถ้ามี (ปกติ redirect: false จะไม่มี)
    console.error("API /api/auth/login Error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" }, { status: 500 });
  }
}
