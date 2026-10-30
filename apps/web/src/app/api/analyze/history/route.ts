import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/guards";
import {
  errorResponse,
  HttpError,
  parseBody,
  readJson,
} from "@/lib/http-error";
import { idListSchema } from "@/lib/validation/api-input";
import { deleteHistories } from "@/server/history";

// รับได้ทั้ง { id } (ลบเดี่ยว) และ { ids } (ลบกลุ่ม)
const deleteSchema = z.union([
  z.object({ id: z.string().min(1) }),
  idListSchema,
]);

export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const body = parseBody(deleteSchema, await readJson(req));
    const ids = "id" in body ? [body.id] : body.ids;
    const deleted = await deleteHistories(ids);
    if (deleted === 0) throw new HttpError(404, "ไม่พบประวัติที่ต้องการลบ");
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(
      error,
      "ลบประวัติไม่สำเร็จ",
      "DELETE /api/analyze/history",
    );
  }
}
