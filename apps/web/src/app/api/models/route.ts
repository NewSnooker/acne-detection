import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guards";
import { errorResponse, parseBody, readJson } from "@/lib/http-error";
import { deleteModelsLogic, uploadModelLogic } from "@/server/models";
import { idListSchema, modelInfoSchema } from "@/lib/validation/api-input";

// อัปโหลดโมเดลใหม่: body = เนื้อไฟล์ .pt ตรง ๆ (ไม่ใช่ multipart) เพื่อเขียนลงดิสก์แบบ stream ได้
// ข้อมูลโมเดลส่งทาง query: fileName, name, version, description
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const query = req.nextUrl.searchParams;
    const info = parseBody(modelInfoSchema, {
      name: query.get("name"),
      version: query.get("version"),
      description: query.get("description"),
    });

    const newModel = await uploadModelLogic(
      { originalName: query.get("fileName") ?? "", body: req.body },
      info.name,
      info.version,
      info.description ?? "",
      guard.session.user.id,
    );
    const { modelData: _omit, ...model } = newModel;
    return NextResponse.json({ success: true, model }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "อัปโหลดโมเดลไม่สำเร็จ", "POST /api/models");
  }
}

// ลบหลายตัว (ข้ามโมเดลหลัก)
export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const { ids } = parseBody(idListSchema, await readJson(req));
    const count = await deleteModelsLogic(ids);
    return NextResponse.json({ success: true, count });
  } catch (error) {
    return errorResponse(error, "ลบโมเดลไม่สำเร็จ", "DELETE /api/models");
  }
}
