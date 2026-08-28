import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { editModelLogic } from "@/lib/services/model-logic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
