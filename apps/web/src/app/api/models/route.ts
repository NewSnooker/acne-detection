import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guards";
import {
  errorResponse,
  HttpError,
  parseBody,
  readJson,
} from "@/lib/http-error";
import {
  deleteModelsLogic,
  uploadModelLogic,
} from "@/lib/services/model-logic";
import { idListSchema, modelInfoSchema } from "@/lib/validation/api-input";

// อัปโหลดโมเดลใหม่ (multipart: file, name, version, description)
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new HttpError(400, "กรุณาเลือกไฟล์โมเดล (.pt)");
    }
    const info = parseBody(modelInfoSchema, {
      name: formData.get("name"),
      version: formData.get("version"),
      description: formData.get("description"),
    });

    const newModel = await uploadModelLogic(
      file,
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
