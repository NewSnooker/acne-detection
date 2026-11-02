import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guards";
import { errorResponse, parseBody, readJson } from "@/lib/http-error";
import { setModelTtaLogic } from "@/server/models";
import { modelTtaSchema } from "@/lib/validation/api-input";

// เปิด/ปิด Test-Time Augmentation ของโมเดล
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const { enabled } = parseBody(modelTtaSchema, await readJson(req));
    await setModelTtaLogic(id, enabled);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(
      error,
      "ตั้งค่า TTA ไม่สำเร็จ",
      "PUT /api/models/[id]/tta",
    );
  }
}
