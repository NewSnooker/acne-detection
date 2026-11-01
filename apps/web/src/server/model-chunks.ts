import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/http-error";

/**
 * เก็บไฟล์โมเดลใน MongoDB แบบหั่นชิ้น (provider "chunks")
 * - ชิ้นละไม่เกิน 4 MB: ผ่านเพดานคำขอ 4.5 MB ของ Vercel และเอกสาร MongoDB 16 MB ได้
 * - ทุก environment (Vercel, Render, Docker, รันในเครื่อง) ที่ใช้ฐานข้อมูลเดียวกันเห็นไฟล์เดียวกัน
 * ขั้นตอน: startChunkedUpload → saveModelChunk ทีละชิ้น → completeChunkedUpload
 */
export const MODEL_CHUNK_SIZE = 4 * 1024 * 1024;

const NOT_FOUND = "ไม่พบข้อมูลโมเดล";

export type StartUploadInput = {
  originalName: string;
  sizeBytes: number;
  name: string;
  version: string;
  description: string;
  userId: string;
};

export async function startChunkedUpload(input: StartUploadInput) {
  if (!input.originalName.toLowerCase().endsWith(".pt")) {
    throw new HttpError(400, "กรุณาอัปโหลดไฟล์นามสกุล .pt เท่านั้น");
  }
  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new HttpError(400, "ไฟล์โมเดลว่างเปล่า");
  }

  // ชื่อไฟล์สุ่มนำหน้า กันชื่อชนกันและอักขระแปลก ๆ
  const uniqueId = crypto.randomBytes(8).toString("hex");
  const safeName = input.originalName.replace(/[^a-zA-Z0-9.-]/g, "_");

  return prisma.aiModel.create({
    data: {
      name: input.name,
      version: input.version,
      description: input.description,
      filePath: "",
      provider: "chunks",
      fileName: `${uniqueId}_${safeName}`,
      sizeBytes: input.sizeBytes,
      sizeMb: parseFloat((input.sizeBytes / (1024 * 1024)).toFixed(2)),
      chunkCount: Math.ceil(input.sizeBytes / MODEL_CHUNK_SIZE),
      uploadComplete: false,
      isActive: false,
      uploadedBy: input.userId,
    },
    select: { id: true, chunkCount: true },
  });
}

/** ขนาดที่ชิ้น index ต้องมี — ทุกชิ้นเต็ม 4 MB ยกเว้นชิ้นสุดท้าย */
export function expectedChunkSize(
  index: number,
  sizeBytes: number,
  chunkCount: number,
) {
  if (index < chunkCount - 1) return MODEL_CHUNK_SIZE;
  return sizeBytes - MODEL_CHUNK_SIZE * (chunkCount - 1);
}

async function findUploadingModel(modelId: string) {
  const model = await prisma.aiModel.findUnique({
    where: { id: modelId },
    select: {
      provider: true,
      sizeBytes: true,
      chunkCount: true,
      uploadComplete: true,
    },
  });
  if (!model) throw new HttpError(404, NOT_FOUND);
  if (
    model.provider !== "chunks" ||
    model.uploadComplete !== false ||
    !model.sizeBytes ||
    !model.chunkCount
  ) {
    throw new HttpError(
      409,
      "โมเดลนี้อัปโหลดเสร็จแล้ว หรือไม่ได้อัปโหลดแบบแบ่งชิ้น",
    );
  }
  return {
    sizeBytes: model.sizeBytes,
    chunkCount: model.chunkCount,
  };
}

/** บันทึกชิ้นที่ index (ส่งซ้ำได้ — ใช้ตอนลองใหม่หลังเน็ตหลุด) */
export async function saveModelChunk(
  modelId: string,
  index: number,
  data: Buffer<ArrayBuffer>,
) {
  const { sizeBytes, chunkCount } = await findUploadingModel(modelId);
  if (!Number.isInteger(index) || index < 0 || index >= chunkCount) {
    throw new HttpError(400, "ลำดับชิ้นไฟล์ไม่ถูกต้อง");
  }
  if (data.length !== expectedChunkSize(index, sizeBytes, chunkCount)) {
    throw new HttpError(400, "ขนาดชิ้นไฟล์ไม่ถูกต้อง กรุณาอัปโหลดใหม่");
  }

  await prisma.aiModelChunk.upsert({
    where: { modelId_index: { modelId, index } },
    create: { modelId, index, data },
    update: { data },
  });
}

/** ตรวจว่าชิ้นครบแล้วเปิดใช้ — ยังไม่มีโมเดลหลักเลย ตัวนี้เป็นโมเดลหลักทันที */
export async function completeChunkedUpload(modelId: string) {
  const { chunkCount } = await findUploadingModel(modelId);
  const received = await prisma.aiModelChunk.count({ where: { modelId } });
  if (received !== chunkCount) {
    throw new HttpError(
      409,
      `อัปโหลดยังไม่ครบ (${received}/${chunkCount} ชิ้น) กรุณาอัปโหลดใหม่`,
    );
  }

  const activeCount = await prisma.aiModel.count({ where: { isActive: true } });
  return prisma.aiModel.update({
    where: { id: modelId },
    data: { uploadComplete: true, isActive: activeCount === 0 },
    omit: { modelData: true },
  });
}

/** เนื้อชิ้นที่ index สำหรับส่งให้บริการ AI — null ถ้าไม่มี */
export async function readModelChunk(modelId: string, index: number) {
  const chunk = await prisma.aiModelChunk.findUnique({
    where: { modelId_index: { modelId, index } },
    select: { data: true },
  });
  return chunk ? Buffer.from(chunk.data) : null;
}

/**
 * รายการ path ที่บริการ AI ต้องดาวน์โหลดแล้วต่อกันเป็นไฟล์ .pt
 * แบบหั่นชิ้น = ทีละชิ้น, แบบเก่า = ทั้งไฟล์จาก GET /api/models/[id]
 */
export async function modelDownloadParts(modelId: string) {
  const model = await prisma.aiModel.findUnique({
    where: { id: modelId },
    select: { provider: true, chunkCount: true, uploadComplete: true },
  });
  if (!model) throw new HttpError(404, NOT_FOUND);
  if (model.uploadComplete === false) {
    throw new HttpError(409, "โมเดลนี้ยังอัปโหลดไม่ครบ");
  }
  if (model.provider !== "chunks") return [`/api/models/${modelId}`];
  return Array.from(
    { length: model.chunkCount ?? 0 },
    (_, i) => `/api/models/${modelId}/chunks/${i}`,
  );
}
