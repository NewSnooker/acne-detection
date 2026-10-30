import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guards";
import { uploadModelLogic } from "@/lib/services/model-logic";

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    const version = formData.get("version") as string;
    const description = formData.get("description") as string;

    const newModel = await uploadModelLogic(
      file,
      name,
      version,
      description,
      guard.session.user.id,
    );

    return NextResponse.json({ success: true, model: newModel });
  } catch (error: any) {
    console.error("API /api/models/create Error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์" },
      { status: 500 },
    );
  }
}
