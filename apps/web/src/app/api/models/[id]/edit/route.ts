import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guards";
import { editModelLogic } from "@/lib/services/model-logic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const body = await req.json();
    const resolvedParams = await params;
    
    await editModelLogic(resolvedParams.id, body);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API /api/models/[id]/edit Error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการแก้ไขโมเดล" },
      { status: 500 }
    );
  }
}
