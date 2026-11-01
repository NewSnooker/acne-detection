import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// จุดเดียวสำหรับตรวจสิทธิ์ ทั้งหน้าเว็บ (redirect) และ API (ตอบ 401/403)
//   401 = ยังไม่ได้เข้าสู่ระบบ, 403 = เข้าสู่ระบบแล้วแต่สิทธิ์ไม่ถึง

// ─── สำหรับหน้าเว็บ (Server Component) ─────────────────────────

/** ต้องเข้าสู่ระบบ ถ้ายังไม่เข้าจะถูกพาไปหน้า /login */
export async function requireUserPage(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

/** ต้องเป็นผู้ดูแลระบบ ถ้าไม่ใช่จะถูกพาไปหน้า /analyze */
export async function requireAdminPage(): Promise<Session> {
  const session = await requireUserPage();
  if (session.user.role !== "ADMIN") {
    redirect("/analyze");
  }
  return session;
}

// ─── สำหรับ API (Route Handler) ────────────────────────────────

export type ApiGuard =
  { ok: true; session: Session } | { ok: false; response: NextResponse };

/** ต้องเข้าสู่ระบบ — ใช้: const guard = await requireUserApi(); if (!guard.ok) return guard.response; */
export async function requireUserApi(): Promise<ApiGuard> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" },
        { status: 401 },
      ),
    };
  }
  return { ok: true, session };
}

/** ต้องเป็นผู้ดูแลระบบ */
export async function requireAdminApi(): Promise<ApiGuard> {
  const guard = await requireUserApi();
  if (!guard.ok) return guard;
  if (guard.session.user.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "เฉพาะผู้ดูแลระบบเท่านั้น" },
        { status: 403 },
      ),
    };
  }
  return guard;
}

/** บริการ AI (header X-API-Key = AI_SERVICE_API_KEY) หรือผู้ดูแลระบบ — ใช้กับ route ที่ส่งไฟล์โมเดล */
export async function requireAiKeyOrAdminApi(
  request: Request,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const apiKey = process.env.AI_SERVICE_API_KEY;
  if (apiKey && request.headers.get("x-api-key") === apiKey) {
    return { ok: true };
  }
  const guard = await requireAdminApi();
  return guard.ok ? { ok: true } : guard;
}
