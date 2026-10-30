import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { saveModel, deleteModelFile } from "@/lib/storage/model-provider";
import { HttpError } from "@/lib/http-error";
import { MODEL_METRICS, type ModelMetricKey } from "@/types/analyze";

export async function uploadModelLogic(
  file: File,
  name: string,
  version: string,
  description: string,
  userId: string,
) {
  if (!file || !file.name.endsWith(".pt")) {
    throw new HttpError(400, "กรุณาอัปโหลดไฟล์นามสกุล .pt เท่านั้น");
  }

  // 1. Save model using Provider
  const uniqueId = crypto.randomBytes(8).toString("hex");
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileName = `${uniqueId}_${safeName}`;

  const saveResult = await saveModel(file, fileName);
  const sizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(2));

  // 2. ตรวจสอบว่ามีโมเดลที่ Active อยู่แล้วหรือไม่
  const activeCount = await prisma.aiModel.count({
    where: { isActive: true },
  });
  const shouldBeActive = activeCount === 0;

  // 3. บันทึกข้อมูลโมเดลใหม่ลงฐานข้อมูล
  const newModel = await prisma.aiModel.create({
    data: {
      name,
      version,
      description,
      filePath: saveResult.filePath,
      modelData: saveResult.modelData,
      provider: saveResult.provider,
      fileName,
      sizeMb,
      isActive: shouldBeActive,
      uploadedBy: userId,
    },
  });

  return newModel;
}

type StoredModel = { id: string; provider: string; filePath: string };

// ประวัติการวิเคราะห์ยังอยู่ แค่ตัดการอ้างถึงโมเดล แล้วจึงลบโมเดลและไฟล์
async function removeModel(model: StoredModel) {
  await prisma.$transaction([
    prisma.analysis.updateMany({
      where: { modelId: model.id },
      data: { modelId: null },
    }),
    prisma.aiModel.delete({ where: { id: model.id } }),
  ]);

  try {
    await deleteModelFile(model.provider, model.filePath);
  } catch (fsError) {
    console.warn("Could not delete file:", fsError);
  }
}

export async function deleteModelLogic(id: string) {
  const model = await prisma.aiModel.findUnique({
    where: { id },
    omit: { modelData: true },
  });
  if (!model) throw new HttpError(404, "ไม่พบข้อมูลโมเดล");
  if (model.isActive) {
    throw new HttpError(
      409,
      "ลบโมเดลหลักที่ใช้งานอยู่ไม่ได้ กรุณาตั้งโมเดลอื่นเป็นโมเดลหลักก่อน",
    );
  }
  await removeModel(model);
}

/** ลบหลายตัว ข้ามโมเดลหลักและรหัสที่ไม่มีอยู่ — คืนจำนวนที่ลบได้จริง */
export async function deleteModelsLogic(ids: string[]) {
  const models = await prisma.aiModel.findMany({
    where: { id: { in: ids }, isActive: false },
    omit: { modelData: true },
  });
  for (const model of models) {
    await removeModel(model);
  }
  return models.length;
}

// ปิดตัวเดิมและเปิดตัวใหม่ใน transaction เดียว — มีโมเดลหลักได้ครั้งละ 1 ตัวเสมอ
export async function setActiveModelLogic(id: string) {
  const exists = await prisma.aiModel.count({ where: { id } });
  if (!exists) throw new HttpError(404, "ไม่พบข้อมูลโมเดล");

  await prisma.$transaction([
    prisma.aiModel.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    }),
    prisma.aiModel.update({
      where: { id },
      data: { isActive: true },
    }),
  ]);
}

type ModelMetricInput = Partial<Record<ModelMetricKey, unknown>>;

// แปลงค่าประเมินที่แอดมินกรอก: ว่าง = null, ต้องเป็นตัวเลข 0–100, ไม่ส่งมา = ไม่แก้
export function parseModelMetrics(input: ModelMetricInput) {
  const result: Partial<Record<ModelMetricKey, number | null>> = {};
  for (const { key, label } of MODEL_METRICS) {
    const raw = input[key];
    if (raw === undefined) continue;
    if (raw === null || raw === "") {
      result[key] = null;
      continue;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new HttpError(400, `ค่า ${label} ต้องเป็นตัวเลข 0–100`);
    }
    result[key] = value;
  }
  return result;
}

export async function editModelLogic(
  id: string,
  data: {
    name: string;
    version: string;
    description?: string;
  } & ModelMetricInput,
) {
  const metrics = parseModelMetrics(data);
  const exists = await prisma.aiModel.count({ where: { id } });
  if (!exists) throw new HttpError(404, "ไม่พบข้อมูลโมเดล");

  await prisma.aiModel.update({
    where: { id },
    data: {
      name: data.name,
      version: data.version,
      description: data.description || null,
      ...metrics,
    },
  });
}
