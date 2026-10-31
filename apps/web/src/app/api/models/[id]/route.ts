import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/guards";
import { errorResponse, parseBody, readJson } from "@/lib/http-error";
import { deleteModelLogic, editModelLogic } from "@/server/models";
import { openModelFile } from "@/lib/storage/model-provider";
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
      select: { fileName: true, provider: true, filePath: true },
    });
    if (!model) {
      return new NextResponse("Model not found", { status: 404 });
    }

    const headers = {
      "Content-Disposition": `attachment; filename="${model.fileName}"`,
      "Content-Type": "application/octet-stream",
    };

    // เก็บเป็นไฟล์: ส่งแบบ stream ไม่โหลดทั้งไฟล์เข้าหน่วยความจำ
    if (model.provider === "file") {
      const stored = await openModelFile(model.filePath);
      if (!stored) {
        return new NextResponse("Model file is missing", { status: 404 });
      }
      return new NextResponse(stored.stream, {
        headers: { ...headers, "Content-Length": stored.size.toString() },
      });
    }

    // เก็บใน MongoDB: ดึง modelData เฉพาะตอนต้องส่งจริง
    const data = await prisma.aiModel.findUnique({
      where: { id },
      select: { modelData: true },
    });
    if (!data?.modelData) {
      return new NextResponse("Model file is missing", { status: 404 });
    }
    const buffer = Buffer.from(data.modelData);
    return new NextResponse(buffer, {
      headers: { ...headers, "Content-Length": buffer.length.toString() },
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
