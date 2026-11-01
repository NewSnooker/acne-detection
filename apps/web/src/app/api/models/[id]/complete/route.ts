import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guards";
import { errorResponse } from "@/lib/http-error";
import { completeChunkedUpload } from "@/server/model-chunks";

// ส่งชิ้นครบแล้ว: ตรวจจำนวนชิ้นและเปิดให้ใช้งาน
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const model = await completeChunkedUpload(id);
    return NextResponse.json({ success: true, model });
  } catch (error) {
    return errorResponse(
      error,
      "ยืนยันการอัปโหลดโมเดลไม่สำเร็จ",
      "POST /api/models/[id]/complete",
    );
  }
}
