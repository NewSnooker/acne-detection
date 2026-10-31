import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import { resolveRedirect } from "@/lib/auth/route-access";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;

  const target = resolveRedirect(
    nextUrl.pathname,
    session ? { role: session.user?.role } : null,
  );
  if (target) {
    return NextResponse.redirect(new URL(target, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // ไม่ผ่าน proxy: /api/models — proxy จะเก็บ body ทั้งก้อนไว้ในหน่วยความจำและตัดทิ้งเงียบ ๆ เมื่อเกิน 10 MB
  // ทำให้อัปโหลดไฟล์โมเดลใหญ่ไม่ได้ (route ของโมเดลตรวจสิทธิ์เองทุกตัวอยู่แล้ว)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|landing/|brand/|api/models).*)",
  ],
};
