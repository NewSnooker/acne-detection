import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/guards";
import { errorResponse, parseBody, readJson } from "@/lib/http-error";
import { deleteModelLogic, editModelLogic } from "@/lib/services/model-logic";
import { editModelSchema } from "@/lib/validation/api-input";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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
      return new NextResponse("Model is not stored in MongoDB", {
        status: 400,
      });
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
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const { id } = await params;
    await deleteModelLogic(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "ลบโมเดลไม่สำเร็จ", "DELETE /api/models/[id]");
  }
}

// แก้ชื่อ เวอร์ชัน รายละเอียด และค่าประเมินโมเดล
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const data = parseBody(editModelSchema, await readJson(req));
    await editModelLogic(id, {
      ...data,
      description: data.description ?? undefined,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(
      error,
      "แก้ไขโมเดลไม่สำเร็จ",
      "PATCH /api/models/[id]",
    );
  }
}
