"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { requireAdminRoute } from "@/lib/auth/guards";

// เช็คสิทธิ์ Admin

export async function hasActiveModel() {
  const count = await prisma.aiModel.count({
    where: { isActive: true },
  });
  return count > 0;
}

export async function uploadAiModel(formData: FormData) {
  const session = await requireAdminRoute();

  const file = formData.get("file") as File;
  const name = formData.get("name") as string;
  const version = formData.get("version") as string;
  const description = formData.get("description") as string;

  if (!file || !file.name.endsWith(".pt")) {
    return { error: "กรุณาอัปโหลดไฟล์นามสกุล .pt เท่านั้น" };
  }

  try {
    // 1. จัดการเรื่องไฟล์
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // สุ่มชื่อไฟล์ใหม่กันชื่อซ้ำ
    const uniqueId = crypto.randomBytes(8).toString("hex");
    const fileName = `${uniqueId}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Path สำหรับเซฟ (อ่านจาก .env.local)
    const storageDir = path.resolve(
      process.cwd(),
      process.env.MODELS_PATH || "../../apps/storage/models",
    );
    const filePath = path.join(storageDir, fileName);

    await writeFile(filePath, buffer);
    const sizeMb = parseFloat((buffer.length / (1024 * 1024)).toFixed(2));

    // 2. ยกเลิกสถานะ Active ของโมเดลเก่าทั้งหมด
    await prisma.aiModel.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // 3. บันทึกข้อมูลโมเดลใหม่ลงฐานข้อมูล
    const newModel = await prisma.aiModel.create({
      data: {
        name,
        version,
        description,
        fileName,
        filePath,
        sizeMb,
        isActive: true, // ตั้งให้เป็นตัวหลักอัตโนมัติ
        uploadedBy: session.user?.id,
      },
    });

    revalidatePath("/admin/models");
    return { success: true, model: newModel };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการอัปโหลดไฟล์",
    };
  }
}

export async function deleteAiModel(id: string) {
  await requireAdminRoute();

  try {
    const model = await prisma.aiModel.findUnique({ where: { id } });
    if (!model) return { error: "ไม่พบข้อมูลโมเดล" };

    // 1. ลบความเชื่อมโยงในตาราง Analysis ก่อน (แทน onDelete: SetNull เพื่อเลี่ยงบั๊ก MongoDB ไม่มี Replica Set)
    await prisma.analysis.updateMany({
      where: { modelId: id },
      data: { modelId: null },
    });

    // 2. ลบออกจากฐานข้อมูล
    await prisma.aiModel.delete({ where: { id } });

    // 2. พยายามลบไฟล์จริงออกจากดิสก์
    try {
      await unlink(model.filePath);
    } catch (fsError) {
      console.warn("Could not delete file from disk:", fsError);
    }

    revalidatePath("/admin/models");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบโมเดล",
    };
  }
}

export async function deleteAiModels(ids: string[]) {
  await requireAdminRoute();

  try {
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
        await unlink(model.filePath);
      } catch (fsError) {
        console.warn("Could not delete file from disk:", fsError);
      }
    }

    revalidatePath("/admin/models");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบโมเดลแบบกลุ่ม",
    };
  }
}

export async function setActiveModel(id: string) {
  await requireAdminRoute();

  try {
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

    revalidatePath("/admin/models");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการเปิดใช้งานโมเดล",
    };
  }
}

interface EditAiModelData {
  name: string;
  version: string;
  description?: string | null;
  mAP50?: number | number | null;
  precision?: number | number | null;
  recall?: number | number | null;
  f1Score?: number | number | null;
}

export async function editAiModel(id: string, data: EditAiModelData) {
  await requireAdminRoute();

  try {
    await prisma.aiModel.update({
      where: { id },
      data: {
        name: data.name,
        version: data.version,
        description: data.description,
      },
    });

    revalidatePath("/admin/models");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการแก้ไขโมเดล",
    };
  }
}
