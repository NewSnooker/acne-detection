import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guards";
import { errorResponse, parseBody, readJson } from "@/lib/http-error";
import { deleteUsersLogic } from "@/server/users";
import { idListSchema } from "@/lib/validation/api-input";

export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const { ids } = parseBody(idListSchema, await readJson(req));
    const count = await deleteUsersLogic(ids, guard.session.user.id);
    return NextResponse.json({ success: true, count });
  } catch (error) {
    return errorResponse(error, "ลบผู้ใช้งานไม่สำเร็จ", "DELETE /api/users");
  }
}
