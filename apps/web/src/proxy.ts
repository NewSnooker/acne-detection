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
    session ? { role: (session.user as any)?.role } : null,
  );
  if (target) {
    return NextResponse.redirect(new URL(target, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|landing/).*)"],
};
