import "server-only";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { saveModel, deleteModelFile } from "@/lib/storage/model-provider";
import { HttpError } from "@/lib/http-error";
import { MODEL_METRICS, type ModelMetricKey } from "@/types/analyze";

export type ModelUpload = {
  /** ชื่อไฟล์เดิมจากเครื่องผู้ใช้ */
  originalName: string;
  /** เนื้อไฟล์แบบ stream — ไม่อ่านทั้งไฟล์เข้าหน่วยความจำ */
  body: ReadableStream<Uint8Array> | null;
};

export async function uploadModelLogic(
  upload: ModelUpload,
  name: string,
  version: string,
  description: string,
  userId: string,
) {
  if (!upload.body || !upload.originalName.toLowerCase().endsWith(".pt")) {
    throw new HttpError(400, "กรุณาอัปโหลดไฟล์นามสกุล .pt เท่านั้น");
  }

  // 1. เก็บไฟล์ (โฟลเดอร์ MODEL_STORAGE_PATH หรือ MongoDB) — ชื่อไฟล์สุ่มนำหน้า กันชนและกัน path แปลก ๆ
  const uniqueId = crypto.randomBytes(8).toString("hex");
  const safeName = upload.originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileName = `${uniqueId}_${safeName}`;

  const saved = await saveModel(
    upload.body as WebReadableStream<Uint8Array>,
    fileName,
  );
  if (saved.sizeBytes === 0) {
    await deleteModelFile(saved.provider, saved.filePath);
    throw new HttpError(400, "ไฟล์โมเดลว่างเปล่า");
  }
  const sizeMb = parseFloat((saved.sizeBytes / (1024 * 1024)).toFixed(2));

  try {
    // 2. ยังไม่มีโมเดลหลัก → ตัวที่อัปโหลดเป็นโมเดลหลักทันที
    const activeCount = await prisma.aiModel.count({
      where: { isActive: true },
    });

    // 3. บันทึกข้อมูลโมเดลใหม่ลงฐานข้อมูล
    return await prisma.aiModel.create({
      data: {
        name,
        version,
        description,
        filePath: saved.filePath,
        modelData: saved.modelData,
        provider: saved.provider,
        fileName,
        sizeMb,
        isActive: activeCount === 0,
        uploadedBy: userId,
      },
    });
  } catch (error) {
    // บันทึกลงฐานข้อมูลไม่สำเร็จ → ไม่ทิ้งไฟล์ค้างในโฟลเดอร์
    await deleteModelFile(saved.provider, saved.filePath).catch(() => {});
    throw error;
  }
}

const ACTIVE_MODEL_ERROR =
  "ลบโมเดลหลักที่ใช้งานอยู่ไม่ได้ กรุณาตั้งโมเดลอื่นเป็นโมเดลหลักก่อน";

/**
 * ลบโมเดลที่ไม่ใช่โมเดลหลักใน transaction เดียว — ประวัติการวิเคราะห์ยังอยู่ แค่ตัดการอ้างถึงโมเดล
 * ตรวจ isActive ใน transaction เดียวกับการลบ จึงไม่พลาดกรณีมีคนตั้งเป็นโมเดลหลักพร้อมกัน
 * คืนรายการที่ลบได้จริง (ข้ามรหัสที่ไม่มีอยู่และโมเดลหลัก)
 */
async function removeInactiveModels(ids: string[]) {
  const removed = await prisma.$transaction(async (tx) => {
    const models = await tx.aiModel.findMany({
      where: { id: { in: ids }, isActive: false },
      select: { id: true, provider: true, filePath: true },
    });
    const removableIds = models.map((m) => m.id);
    if (removableIds.length === 0) return [];

    await tx.analysis.updateMany({
      where: { modelId: { in: removableIds } },
      data: { modelId: null },
    });
    const { count } = await tx.aiModel.deleteMany({
      where: { id: { in: removableIds }, isActive: false },
    });
    if (count !== removableIds.length)
      throw new HttpError(409, ACTIVE_MODEL_ERROR);
    return models;
  });

  await Promise.all(
    removed.map((model) =>
      deleteModelFile(model.provider, model.filePath).catch((fsError) =>
        console.warn("Could not delete file:", fsError),
      ),
    ),
  );
  return removed;
}

export async function deleteModelLogic(id: string) {
  const removed = await removeInactiveModels([id]);
  if (removed.length > 0) return;

  const exists = await prisma.aiModel.count({ where: { id } });
  throw exists
    ? new HttpError(409, ACTIVE_MODEL_ERROR)
    : new HttpError(404, "ไม่พบข้อมูลโมเดล");
}

/** ลบหลายตัว ข้ามโมเดลหลักและรหัสที่ไม่มีอยู่ — คืนจำนวนที่ลบได้จริง */
export async function deleteModelsLogic(ids: string[]) {
  return (await removeInactiveModels(ids)).length;
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

export async function getAdminModels() {
  // ไม่ดึง modelData (ตัวไฟล์ .pt หลาย MB) เพราะหน้าตารางไม่ได้ใช้
  // ถ้าดึงมา ข้อมูลทั้งไฟล์จะถูกส่งไปที่เบราว์เซอร์ทุกครั้งที่เปิดหน้า
  const models = await prisma.aiModel.findMany({
    orderBy: { createdAt: "desc" },
    omit: { modelData: true },
    include: {
      _count: {
        select: { analyses: true },
      },
    },
  });
  return models.map((model) => ({ ...model, modelData: null }));
}
