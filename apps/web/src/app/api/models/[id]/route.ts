import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, requireAiKeyOrAdminApi } from "@/lib/auth/guards";
import { readModelChunk } from "@/server/model-chunks";
import {
  errorResponse,
  HttpError,
  parseBody,
  readJson,
} from "@/lib/http-error";
import { deleteModelLogic, editModelLogic } from "@/server/models";
import { openModelFile } from "@/lib/storage/model-provider";
import { editModelSchema } from "@/lib/validation/api-input";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ไฟล์โมเดลโหลดได้เฉพาะ AI service (ส่ง header X-API-Key) หรือผู้ดูแลระบบที่เข้าสู่ระบบอยู่
    const guard = await requireAiKeyOrAdminApi(request);
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const model = await prisma.aiModel.findUnique({
      where: { id },
      select: {
        fileName: true,
        provider: true,
        filePath: true,
        sizeBytes: true,
        chunkCount: true,
        uploadComplete: true,
      },
    });
    if (!model) {
      throw new HttpError(404, "ไม่พบข้อมูลโมเดล");
    }

    const headers = {
      "Content-Disposition": `attachment; filename="${model.fileName}"`,
      "Content-Type": "application/octet-stream",
    };

    // หั่นชิ้นใน MongoDB: ส่งต่อกันทีละชิ้นแบบ stream (บริการ AI ใช้ /manifest + /chunks แทน
    // เพราะบน Vercel ส่งคำตอบได้ไม่เกิน 4.5 MB — ทางนี้ไว้ให้แอดมินดาวน์โหลดจาก Docker/เครื่องตัวเอง)
    if (model.provider === "chunks") {
      if (model.uploadComplete === false || !model.chunkCount) {
        throw new HttpError(409, "โมเดลนี้ยังอัปโหลดไม่ครบ");
      }
      const chunkCount = model.chunkCount;
      let next = 0;
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          if (next >= chunkCount) return controller.close();
          const data = await readModelChunk(id, next++);
          if (!data) return controller.error(new Error("Missing model chunk"));
          controller.enqueue(new Uint8Array(data));
        },
      });
      return new NextResponse(stream, {
        headers: {
          ...headers,
          ...(model.sizeBytes && {
            "Content-Length": model.sizeBytes.toString(),
          }),
        },
      });
    }

    // เก็บเป็นไฟล์: ส่งแบบ stream ไม่โหลดทั้งไฟล์เข้าหน่วยความจำ
    if (model.provider === "file") {
      const stored = await openModelFile(model.filePath).catch(() => null);
      if (!stored) {
        // ไฟล์อยู่บนดิสก์ของเครื่องที่อัปโหลด (แบบเก่า) — เซิร์ฟเวอร์นี้ไม่มีไฟล์
        throw new HttpError(
          409,
          "ไฟล์โมเดลนี้อยู่บนเครื่องที่อัปโหลด เซิร์ฟเวอร์นี้เปิดไม่ได้ กรุณาอัปโหลดไฟล์ใหม่",
        );
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
      throw new HttpError(404, "ไม่พบไฟล์โมเดลในฐานข้อมูล");
    }
    const buffer = Buffer.from(data.modelData);
    return new NextResponse(buffer, {
      headers: { ...headers, "Content-Length": buffer.length.toString() },
    });
  } catch (error) {
    return errorResponse(
      error,
      "ส่งไฟล์โมเดลไม่สำเร็จ",
      "GET /api/models/[id]",
    );
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
