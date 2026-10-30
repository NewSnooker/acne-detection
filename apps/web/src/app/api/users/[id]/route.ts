import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guards";
import { deleteUserLogic } from "@/lib/services/user-logic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const resolvedParams = await params;
    await deleteUserLogic(resolvedParams.id, guard.session.user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API /api/users/[id] Error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการลบผู้ใช้งาน" },
      { status: 500 },
    );
  }
}
