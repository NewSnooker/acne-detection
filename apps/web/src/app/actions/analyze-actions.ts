"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { Prisma } from "@prisma/client";

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

// Heuristic for Severity
function calculateSeverity(
  counts: Record<string, number>,
): "MILD" | "MODERATE" | "SEVERE" {
  const inflammatory = (counts["papule"] || 0) + (counts["pustule"] || 0);
  const severeLesions = (counts["nodule"] || 0) + (counts["cyst"] || 0);

  if (severeLesions > 3 || inflammatory > 30) return "SEVERE";
  if (severeLesions > 0 || inflammatory > 10) return "MODERATE";
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

    // 2. Save image to disk using STORAGE_PATH (production safe)
    let storagePath = process.env.STORAGE_PATH;
    if (!storagePath || !path.isAbsolute(storagePath)) {
      const cwd = process.cwd();
      if (cwd.endsWith("web")) {
        storagePath = path.resolve(cwd, "..", "..", "apps", "images");
      } else {
        storagePath = path.resolve(cwd, "apps", "images");
      }
    }

    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = path.join(storagePath, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // 3. Call FastAPI for prediction
    const fastApiUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    const apiKey =
      process.env.AI_SERVICE_API_KEY ||
      "1juc+3JyvBqyZpRe9Ar9+cd05WWWyMgORKTfE512PVk";

    const apiFormData = new FormData();
    apiFormData.append("image_path", filePath);
    apiFormData.append("model_path", activeModel.filePath);
    apiFormData.append("confidence", "0.25"); // Default confidence for UI

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
        userId: session.user.id,
        modelId: activeModel.id,
        originalImage: fileName, // เก็บแค่ชื่อไฟล์ เดี๋ยว Next.js Serve รูปผ่าน /api/storage/images
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
        imageName: fileName,
      },
    };
  } catch (error) {
    console.error("Error analyzing image:", error);
    return {
      error:
        error instanceof Error ? error.message : "เกิดข้อผิดพลาดในระบบวิเคราห์",
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
    });

    if (!analysis) {
      return { error: "Analysis not found" };
    }

    // Resolve storage path same as in analyzeImage
    let storagePath = process.env.STORAGE_PATH;
    if (!storagePath || !path.isAbsolute(storagePath)) {
      const cwd = process.cwd();
      if (cwd.endsWith("web")) {
        storagePath = path.resolve(cwd, "..", "..", "apps", "images");
      } else {
        storagePath = path.resolve(cwd, "apps", "images");
      }
    }

    // Try to delete the image file
    try {
      const imagePath = path.join(storagePath, analysis.originalImage);
      if (fs.existsSync(imagePath)) {
        await fs.promises.unlink(imagePath);
      }
    } catch (fsError) {
      console.error("Failed to delete image file:", fsError);
      // We continue even if file deletion fails
    }

    await prisma.analysis.delete({
      where: { id },
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
    });

    // Resolve storage path same as in analyzeImage
    let storagePath = process.env.STORAGE_PATH;
    if (!storagePath || !path.isAbsolute(storagePath)) {
      const cwd = process.cwd();
      if (cwd.endsWith("web")) {
        storagePath = path.resolve(cwd, "..", "..", "apps", "images");
      } else {
        storagePath = path.resolve(cwd, "apps", "images");
      }
    }

    // Try to delete image files
    for (const analysis of analyses) {
      try {
        const imagePath = path.join(storagePath, analysis.originalImage);
        if (fs.existsSync(imagePath)) {
          await fs.promises.unlink(imagePath);
        }
      } catch (fsError) {
        console.error("Failed to delete image file:", fsError);
      }
    }

    await prisma.analysis.deleteMany({
      where: { id: { in: ids } },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete histories:", error);
    return { error: "Failed to delete histories" };
  }
}
