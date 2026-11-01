import { NextResponse } from "next/server";
import { requireAdminApi, requireAiKeyOrAdminApi } from "@/lib/auth/guards";
import { errorResponse, HttpError } from "@/lib/http-error";
import {
  MODEL_CHUNK_SIZE,
  readModelChunk,
  saveModelChunk,
} from "@/server/model-chunks";

type Params = { params: Promise<{ id: string; index: string }> };

function parseIndex(raw: string) {
  const index = Number(raw);
  if (!Number.isInteger(index) || index < 0) {
    throw new HttpError(400, "ลำดับชิ้นไฟล์ไม่ถูกต้อง");
  }
  return index;
}

// แอดมินส่งชิ้นไฟล์ (body = เนื้อไฟล์ตรง ๆ ไม่เกิน 4 MB)
export async function PUT(req: Request, { params }: Params) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const { id, index } = await params;
    // ต้องบอกขนาดมาก่อน ไม่งั้น arrayBuffer() จะอ่านทั้งก้อนเข้าหน่วยความจำก่อนตรวจได้
    const declared = Number(req.headers.get("content-length"));
    if (!Number.isFinite(declared) || declared <= 0) {
      throw new HttpError(411, "ไม่ทราบขนาดชิ้นไฟล์ กรุณาอัปโหลดใหม่");
    }
    if (declared > MODEL_CHUNK_SIZE) {
      throw new HttpError(413, "ชิ้นไฟล์ใหญ่เกิน 4 MB");
    }
    const data = Buffer.from(await req.arrayBuffer());
    await saveModelChunk(id, parseIndex(index), data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(
      error,
      "อัปโหลดชิ้นไฟล์ไม่สำเร็จ",
      "PUT /api/models/[id]/chunks/[index]",
    );
  }
}

// บริการ AI (X-API-Key) หรือแอดมินดาวน์โหลดชิ้นไฟล์
export async function GET(req: Request, { params }: Params) {
  try {
    const guard = await requireAiKeyOrAdminApi(req);
    if (!guard.ok) return guard.response;

    const { id, index } = await params;
    const data = await readModelChunk(id, parseIndex(index));
    if (!data) throw new HttpError(404, "ไม่พบชิ้นไฟล์โมเดล");
    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": data.length.toString(),
      },
    });
  } catch (error) {
    return errorResponse(
      error,
      "อ่านชิ้นไฟล์โมเดลไม่สำเร็จ",
      "GET /api/models/[id]/chunks/[index]",
    );
  }
}
