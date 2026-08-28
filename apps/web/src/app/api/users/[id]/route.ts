import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteUserLogic } from "@/lib/services/user-logic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    await deleteUserLogic(resolvedParams.id, session.user.id);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API /api/users/[id] Error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการลบผู้ใช้งาน" },
      { status: 500 }
    );
  }
}
