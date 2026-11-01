import { NextResponse } from "next/server";
import { requireAiKeyOrAdminApi } from "@/lib/auth/guards";
import { errorResponse } from "@/lib/http-error";
import { modelDownloadParts } from "@/server/model-chunks";

// บริการ AI ถามก่อนว่าต้องดาวน์โหลดไฟล์โมเดลจาก path ไหนบ้าง (เรียงตามลำดับแล้วต่อกัน)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireAiKeyOrAdminApi(req);
    if (!guard.ok) return guard.response;

    const { id } = await params;
    return NextResponse.json({ parts: await modelDownloadParts(id) });
  } catch (error) {
    return errorResponse(
      error,
      "อ่านข้อมูลไฟล์โมเดลไม่สำเร็จ",
      "GET /api/models/[id]/manifest",
    );
  }
}
