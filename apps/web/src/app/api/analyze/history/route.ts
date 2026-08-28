import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteHistoryLogic, deleteHistoriesLogic } from "@/lib/services/history-service";

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    // เฉพาะ ADMIN เท่านั้นที่ลบประวัติได้
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (body.id) {
      // ลบเดี่ยว
      await deleteHistoryLogic(body.id);
      return NextResponse.json({ success: true });
    } else if (body.ids && Array.isArray(body.ids)) {
      // ลบกลุ่ม
      await deleteHistoriesLogic(body.ids);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
  } catch (error: any) {
    console.error("API /api/analyze/history Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete history" },
      { status: 500 }
    );
  }
}
