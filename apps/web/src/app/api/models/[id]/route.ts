import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/guards";
import { deleteModelLogic, setActiveModelLogic } from "@/lib/services/model-logic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ไฟล์โมเดลโหลดได้เฉพาะ AI service (ส่ง header X-API-Key) หรือผู้ดูแลระบบที่เข้าสู่ระบบอยู่
    const apiKey = process.env.AI_SERVICE_API_KEY;
    const hasValidKey =
      Boolean(apiKey) && request.headers.get("x-api-key") === apiKey;
    if (!hasValidKey) {
      const guard = await requireAdminApi();
      if (!guard.ok) return guard.response;
    }

    const { id } = await params;
    const model = await prisma.aiModel.findUnique({
      where: { id },
      select: { modelData: true, fileName: true, provider: true },
    });

    if (!model) {
      return new NextResponse("Model not found", { status: 404 });
    }

    if (model.provider !== "mongodb" || !model.modelData) {
      return new NextResponse("Model is not stored in MongoDB", { status: 400 });
    }

    // Convert Prisma Bytes to Buffer for response
    const buffer = Buffer.from(model.modelData);

    return new NextResponse(buffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${model.fileName}"`,
        "Content-Type": "application/octet-stream",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error serving model:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;
    const resolvedParams = await params;
    await deleteModelLogic(resolvedParams.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการลบโมเดล" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;
    const resolvedParams = await params;
    await setActiveModelLogic(resolvedParams.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการเปิดใช้งานโมเดล" },
      { status: 500 }
    );
  }
}
