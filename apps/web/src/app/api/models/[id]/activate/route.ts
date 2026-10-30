import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guards";
import { errorResponse } from "@/lib/http-error";
import { setActiveModelLogic } from "@/server/models";

// ตั้งเป็นโมเดลหลัก (ตัวที่ใช้วิเคราะห์)
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const { id } = await params;
    await setActiveModelLogic(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(
      error,
      "ตั้งโมเดลหลักไม่สำเร็จ",
      "POST /api/models/[id]/activate",
    );
  }
}
