// กติกาว่าใครเข้าหน้าไหนได้ ใช้ใน proxy.ts (middleware)
// แยกเป็นฟังก์ชันล้วนเพื่อให้ทดสอบได้โดยไม่ต้องรัน Auth.js

export const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/api/auth", // NextAuth callbacks (OAuth, session, etc.)
  "/api/account", // Custom Auth APIs (register, etc.)
  "/api/models", // FastAPI ต้องดาวน์โหลดโมเดล (GET /api/models/[id]) — route ตรวจสิทธิ์เองด้วย X-API-Key
];
// หน้าสาธารณะที่ต้องตรงทั้ง path (ใช้ startsWith กับ "/" ไม่ได้ เพราะจะเปิดทุกหน้า)
export const PUBLIC_PAGES = ["/", "/knowledge", "/acne-types", "/accuracy"];
export const ADMIN_ROUTES = ["/admin"];

export type RouteVisitor = { role?: string | null } | null;

/**
 * คืน path ที่ต้องพาไป (redirect) หรือ null ถ้าให้เข้าได้
 * @param pathname path ที่ขอเข้า เช่น "/analyze"
 * @param visitor  null = ยังไม่เข้าสู่ระบบ
 */
export function resolveRedirect(
  pathname: string,
  visitor: RouteVisitor,
): string | null {
  const isLoggedIn = visitor !== null;
  const isPublic =
    PUBLIC_PAGES.includes(pathname) ||
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));

  // เข้าสู่ระบบแล้วไม่ต้องเห็นหน้า login อีก
  if (isLoggedIn && pathname === "/login") return "/analyze";

  // ยังไม่เข้าสู่ระบบ เข้าได้เฉพาะหน้าสาธารณะ
  if (!isLoggedIn && !isPublic) return "/login";

  // หน้าแอดมินเข้าได้เฉพาะผู้ดูแลระบบ
  if (isAdminRoute && visitor?.role !== "ADMIN") return "/analyze";

  return null;
}
