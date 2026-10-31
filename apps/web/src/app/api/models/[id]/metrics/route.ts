import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guards";
import { errorResponse } from "@/lib/http-error";
import { importModelMetricsLogic } from "@/server/models";

// อ่านค่าประเมิน (mAP@0.5, Precision, Recall, F1) จากไฟล์ .pt แล้วบันทึก
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const metrics = await importModelMetricsLogic(id);
    return NextResponse.json({ success: true, metrics });
  } catch (error) {
    return errorResponse(
      error,
      "อ่านค่าประเมินจากไฟล์โมเดลไม่สำเร็จ",
      "POST /api/models/[id]/metrics",
    );
  }
}
