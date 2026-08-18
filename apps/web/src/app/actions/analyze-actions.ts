"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { Prisma } from "@prisma/client";
import { uploadImage, deleteImage } from "@/lib/storage/image-provider";
import { ACCURACY_THRESHOLD } from "@/types/analyze";

// Types
interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
interface Detection {
  type: string;
  confidence: number;
  bbox: BBox;
}
interface AnalysisResult {
  detections: Detection[];
  counts: Record<string, number>;
  total: number;
}

// Heuristic for Severity (AAD / ALADIN)
function calculateSeverity(
  counts: Record<string, number>,
): "MILD" | "MODERATE" | "SEVERE" {
  const nonInflammatory = (counts["blackhead"] || 0) + (counts["whitehead"] || 0);
  const shallowInflammatory = (counts["papule"] || 0) + (counts["pustule"] || 0);
  const deepInflammatory = (counts["nodule"] || 0) + (counts["cyst"] || 0);

  // 3. สิวระดับรุนแรง (Severe Acne)
  // ตรวจพบสิวอักเสบระดับตื้นมากกว่า 20 จุด หรือตรวจพบกลุ่มสิวอักเสบลึกตั้งแต่ 1 จุดขึ้นไป
  if (shallowInflammatory > 20 || deepInflammatory >= 1) return "SEVERE";

  // 2. สิวระดับปานกลาง (Moderate Acne)
  // ตรวจพบสิวชนิดไม่อักเสบกระจายตัวมากกว่า 20 จุด หรือมีสิวอักเสบระดับตื้นจำนวน 6 ถึง 20 จุด
  if (nonInflammatory > 20 || (shallowInflammatory >= 6 && shallowInflammatory <= 20)) return "MODERATE";

  // 1. สิวระดับเล็กน้อย (Mild Acne)
  // ตรวจพบสิวชนิดไม่อักเสบจำนวนน้อยกว่าหรือเท่ากับ 20 จุด หรือมีสิวอักเสบระดับตื้นไม่เกิน 5 จุด
  return "MILD";
}

export async function analyzeImage(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const file = formData.get("image") as File;
    if (!file) {
      return { error: "ไม่พบไฟล์รูปภาพ" };
    }

    // 1. Find active model
    const activeModel = await prisma.aiModel.findFirst({
      where: { isActive: true },
    });

    if (!activeModel) {
      return {
        error: "ไม่มีโมเดลที่กำลังเปิดใช้งานอยู่ในระบบ กรุณาติดต่อแอดมิน",
      };
    }

    // 2. Save image using Image Provider
    const imageResult = await uploadImage(file);

    // 3. Call FastAPI for prediction
    const fastApiUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    const apiKey =
      process.env.AI_SERVICE_API_KEY ||
      "1juc+3JyvBqyZpRe9Ar9+cd05WWWyMgORKTfE512PVk";

    const apiFormData = new FormData();
    if (imageResult.imageProvider === "cloudinary" && imageResult.imageUrl) {
      apiFormData.append("image_url_or_path", imageResult.imageUrl);
    } else {
      let storagePath =
        process.env.STORAGE_PATH ||
        path.resolve(process.cwd(), "apps", "images");
      apiFormData.append(
        "image_url_or_path",
        path.join(storagePath, imageResult.originalImage),
      );
    }

    // โมเดลอยู่ใน MongoDB เสมอ → ส่ง URL ให้ FastAPI ดาวน์โหลด
    const appUrl = process.env.INTERNAL_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const activeModelPath = `${appUrl}/api/models/${activeModel.id}`;

    apiFormData.append("model_url_or_path", activeModelPath);
    apiFormData.append("confidence", ACCURACY_THRESHOLD.toString()); // Default confidence for UI

    const response = await fetch(`${fastApiUrl}/predict`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
      },
      body: apiFormData,
      cache: "no-store", // ป้องกัน Next.js Cache ผลลัพธ์
    });

    if (!response.ok) {
      console.error("FastAPI error:", await response.text());
      return { error: "การประมวลผลรูปภาพขัดข้อง" };
    }

    const result: AnalysisResult = await response.json();

    const severity = calculateSeverity(result.counts);

    // 5. Save to database
    const analysisRecord = await prisma.analysis.create({
      data: {
        user: { connect: { id: session.user.id } },
        model: { connect: { id: activeModel.id } },
        image: {
          create: {
            fileName: imageResult.originalImage,
            url: imageResult.imageUrl,
            provider: imageResult.imageProvider,
          },
        },
        detections: result.detections as unknown as Prisma.InputJsonValue,
        counts: result.counts as unknown as Prisma.InputJsonValue,
        total: result.total,
        severity: severity,
      },
    });

    return {
      success: true,
      data: {
        ...result,
        id: analysisRecord.id,
        severity,
        imageName: imageResult.originalImage,
        imageUrl: imageResult.imageUrl,
        imageProvider: imageResult.imageProvider,
      },
    };
  } catch (error) {
    console.error("Error analyzing image:", error);
    // ซ่อน Error เชิงเทคนิค (เช่น Prisma Error) ไม่ให้ไปแสดงที่หน้าเว็บ
    return {
      error: "เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง หรือเข้าสู่ระบบใหม่",
    };
  }
}

export async function deleteHistory(id: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    const analysis = await prisma.analysis.findUnique({
      where: { id },
      include: { image: true },
    });

    if (!analysis || !analysis.image) {
      return { error: "Analysis or Image not found" };
    }

    // 1. Delete the image file
    try {
      await deleteImage(analysis.image.fileName, analysis.image.provider);
    } catch (fsError) {
      console.error("Failed to delete image file:", fsError);
      return { error: "Failed to delete image file" };
    }

    // 2. Delete the Image record from DB (this will cascade delete the Analysis record)
    await prisma.image.delete({
      where: { id: analysis.image.id },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete history:", error);
    return { error: "Failed to delete history" };
  }
}

export async function deleteHistories(ids: string[]) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    const analyses = await prisma.analysis.findMany({
      where: { id: { in: ids } },
      include: { image: true },
    });

    // 1. Delete image files
    for (const analysis of analyses) {
      if (!analysis.image) continue;
      try {
        await deleteImage(analysis.image.fileName, analysis.image.provider);
      } catch (fsError) {
        console.error("Failed to delete image file:", fsError);
      }
    }

    // 2. Delete Image records from DB (cascades to Analysis records)
    const imageIds = analyses
      .map((a) => a.image?.id)
      .filter(Boolean) as string[];
    await prisma.image.deleteMany({
      where: { id: { in: imageIds } },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete histories:", error);
    return { error: "Failed to delete histories" };
  }
}
