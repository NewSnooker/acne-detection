import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteModelsLogic } from "@/lib/services/model-logic";

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

    await deleteModelsLogic(body.ids);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API /api/models Error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการลบโมเดลแบบกลุ่ม" },
      { status: 500 }
    );
  }
}
