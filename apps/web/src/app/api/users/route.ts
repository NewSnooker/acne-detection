import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteUsersLogic } from "@/lib/services/user-logic";

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.ids || !Array.isArray(body.ids)) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const count = await deleteUsersLogic(body.ids, session.user.id);
    
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error("API /api/users Error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการลบกลุ่มผู้ใช้งาน" },
      { status: 500 }
    );
  }
}
