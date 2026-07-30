import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = ["/login", "/register", "/api/auth"];
const ADMIN_ROUTES = ["/admin"];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session;

  const isPublic = PUBLIC_ROUTES.some((r) => nextUrl.pathname.startsWith(r));
  const isAdmin = ADMIN_ROUTES.some((r) => nextUrl.pathname.startsWith(r));

  if (isLoggedIn && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/analyze", nextUrl));
  }

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (
    isAdmin &&
    (session?.user as any)?.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/analyze", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|storage/).*)"],
};
