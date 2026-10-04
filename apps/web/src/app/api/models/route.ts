import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guards";
import { deleteModelsLogic } from "@/lib/services/model-logic";

export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

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
