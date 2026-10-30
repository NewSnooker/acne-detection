import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guards";
import { errorResponse } from "@/lib/http-error";
import { deleteUserLogic } from "@/lib/services/user-logic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const { id } = await params;
    await deleteUserLogic(id, guard.session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(
      error,
      "ลบผู้ใช้งานไม่สำเร็จ",
      "DELETE /api/users/[id]",
    );
  }
}
