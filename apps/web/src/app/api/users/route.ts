import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guards";
import { deleteUsersLogic } from "@/lib/services/user-logic";

export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const body = await req.json();
    if (!body.ids || !Array.isArray(body.ids)) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 },
      );
    }

    const count = await deleteUsersLogic(body.ids, guard.session.user.id);

    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error("API /api/users Error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการลบกลุ่มผู้ใช้งาน" },
      { status: 500 },
    );
  }
}
