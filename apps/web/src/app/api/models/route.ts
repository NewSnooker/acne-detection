import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guards";
import { errorResponse, parseBody, readJson } from "@/lib/http-error";
import { deleteModelsLogic } from "@/server/models";
import { MODEL_CHUNK_SIZE, startChunkedUpload } from "@/server/model-chunks";
import { idListSchema, startUploadSchema } from "@/lib/validation/api-input";

// เริ่มอัปโหลดโมเดล: สร้าง record (ยังไม่ครบ) แล้วให้เบราว์เซอร์ส่งไฟล์ทีละชิ้น
// → PUT /api/models/[id]/chunks/[index] → POST /api/models/[id]/complete
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const input = parseBody(startUploadSchema, await readJson(req));
    const model = await startChunkedUpload({
      originalName: input.fileName,
      sizeBytes: input.sizeBytes,
      name: input.name,
      version: input.version,
      description: input.description ?? "",
      userId: guard.session.user.id,
    });
    return NextResponse.json(
      { success: true, model, chunkSize: MODEL_CHUNK_SIZE },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(
      error,
      "เริ่มอัปโหลดโมเดลไม่สำเร็จ",
      "POST /api/models",
    );
  }
}

// ลบหลายตัว (ข้ามโมเดลหลัก)
export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const { ids } = parseBody(idListSchema, await readJson(req));
    const count = await deleteModelsLogic(ids);
    return NextResponse.json({ success: true, count });
  } catch (error) {
    return errorResponse(error, "ลบโมเดลไม่สำเร็จ", "DELETE /api/models");
  }
}
