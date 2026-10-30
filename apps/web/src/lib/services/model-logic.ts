import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { saveModel, deleteModelFile } from "@/lib/storage/model-provider";
import { MODEL_METRICS, type ModelMetricKey } from "@/types/analyze";

export async function uploadModelLogic(
  file: File,
  name: string,
  version: string,
  description: string,
  userId: string,
) {
  if (!file || !file.name.endsWith(".pt")) {
    throw new Error("กรุณาอัปโหลดไฟล์นามสกุล .pt เท่านั้น");
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
      modelData: saveResult.modelData as any,
      provider: saveResult.provider,
      fileName,
      sizeMb,
      isActive: shouldBeActive,
      uploadedBy: userId,
    },
  });

  return newModel;
}

export async function deleteModelLogic(id: string) {
  const model = await prisma.aiModel.findUnique({ where: { id } });
  if (!model) throw new Error("ไม่พบข้อมูลโมเดล");

  // 1. ลบความเชื่อมโยงในตาราง Analysis ก่อน
  await prisma.analysis.updateMany({
    where: { modelId: id },
    data: { modelId: null },
  });

  // 2. ลบออกจากฐานข้อมูล
  await prisma.aiModel.delete({ where: { id } });

  // 3. พยายามลบไฟล์จริง
  try {
    await deleteModelFile(model.provider, model.filePath);
  } catch (fsError) {
    console.warn("Could not delete file:", fsError);
  }
}

export async function deleteModelsLogic(ids: string[]) {
  for (const id of ids) {
    const model = await prisma.aiModel.findUnique({ where: { id } });
    if (!model) continue;

    if (model.isActive) continue; // ห้ามลบโมเดลหลักที่ใช้งานอยู่

    await prisma.analysis.updateMany({
      where: { modelId: id },
      data: { modelId: null },
    });

    await prisma.aiModel.delete({ where: { id } });

    try {
      await deleteModelFile(model.provider, model.filePath);
    } catch (fsError) {
      console.warn("Could not delete file:", fsError);
    }
  }
}

export async function setActiveModelLogic(id: string) {
  // 1. ตั้งตัวอื่นๆ ให้ isActive = false
  await prisma.aiModel.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  // 2. ตั้งตัวที่เลือกให้ isActive = true
  await prisma.aiModel.update({
    where: { id },
    data: { isActive: true },
  });
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
      throw new Error(`ค่า ${label} ต้องเป็นตัวเลข 0–100`);
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
  await prisma.aiModel.update({
    where: { id },
    data: {
      name: data.name,
      version: data.version,
      description: data.description || null,
      ...parseModelMetrics(data),
    },
  });
}
