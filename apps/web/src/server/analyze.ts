import "server-only";
import { AnalysisResult, DEFAULT_CONFIDENCE_THRESHOLD } from "@/types/analyze";
import path from "path";
import { getStoragePath } from "@/lib/storage/image-provider";

// Heuristic for Severity (AAD / ALADIN)
export function calculateSeverity(
  counts: Record<string, number>,
): "MILD" | "MODERATE" | "SEVERE" {
  const nonInflammatory =
    (counts["blackhead"] || 0) + (counts["whitehead"] || 0);
  const shallowInflammatory =
    (counts["papule"] || 0) + (counts["pustule"] || 0);
  const deepInflammatory = (counts["nodule"] || 0) + (counts["cyst"] || 0);

  // 3. สิวระดับรุนแรง (Severe Acne)
  // ตรวจพบสิวอักเสบระดับตื้นมากกว่า 20 จุด หรือตรวจพบกลุ่มสิวอักเสบลึกตั้งแต่ 1 จุดขึ้นไป
  if (shallowInflammatory > 20 || deepInflammatory >= 1) return "SEVERE";

  // 2. สิวระดับปานกลาง (Moderate Acne)
  // ตรวจพบสิวชนิดไม่อักเสบกระจายตัวมากกว่า 20 จุด หรือมีสิวอักเสบระดับตื้นจำนวน 6 ถึง 20 จุด
  if (
    nonInflammatory > 20 ||
    (shallowInflammatory >= 6 && shallowInflammatory <= 20)
  )
    return "MODERATE";

  // 1. สิวระดับเล็กน้อย (Mild Acne)
  // ตรวจพบสิวชนิดไม่อักเสบจำนวนน้อยกว่าหรือเท่ากับ 20 จุด หรือมีสิวอักเสบระดับตื้นไม่เกิน 5 จุด
  return "MILD";
}

/**
 * ฟังก์ชันสำหรับส่งคำขอไปประมวลผลที่ FastAPI AI Service
 */
/** ที่อยู่และ key ของบริการ AI (FastAPI) — key ต้องมาจาก env เท่านั้น */
export function getAiServiceConfig() {
  const url = process.env.AI_SERVICE_URL || "http://localhost:8000";
  const apiKey = process.env.AI_SERVICE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ระบบยังไม่ได้ตั้งค่า AI_SERVICE_API_KEY กรุณาติดต่อผู้ดูแลระบบ",
    );
  }
  return { url, apiKey };
}

/** ความมั่นใจขั้นต่ำ: env AI_CONFIDENCE_THRESHOLD (0–1) ไม่ตั้งหรือค่าผิด = ค่าเริ่มต้น */
export function confidenceThreshold() {
  const value = Number(process.env.AI_CONFIDENCE_THRESHOLD);
  return value > 0 && value < 1 ? value : DEFAULT_CONFIDENCE_THRESHOLD;
}

/** URL ที่ FastAPI ใช้ดาวน์โหลดไฟล์โมเดล (GET /api/models/[id]) */
export function modelDownloadUrl(modelId: string) {
  const appUrl =
    process.env.INTERNAL_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return `${appUrl}/api/models/${modelId}`;
}

export async function callFastApiForPrediction(
  imageResult: {
    originalImage: string;
    imageUrl?: string | null;
    imageProvider: string;
  },
  activeModel: { id: string; useTta: boolean },
): Promise<AnalysisResult> {
  const { url: fastApiUrl, apiKey } = getAiServiceConfig();
  const confidence = confidenceThreshold();

  const apiFormData = new FormData();

  if (imageResult.imageUrl) {
    // Hosted (Vercel Blob): ส่ง Public URL ให้ FastAPI ดาวน์โหลด
    apiFormData.append("image_url_or_path", imageResult.imageUrl);
  } else {
    // Local/Docker: ส่ง Absolute Path ของไฟล์ใน Shared Volume
    // ใช้โฟลเดอร์เดียวกับตอนเซฟรูป (ถ้าไม่ได้ตั้ง STORAGE_PATH จะเป็น apps/images)
    const storagePath = getStoragePath();
    apiFormData.append(
      "image_url_or_path",
      path.join(storagePath, imageResult.originalImage),
    );
  }

  // ส่ง URL ไปให้ FastAPI ดาวน์โหลดโมเดล
  const activeModelPath = modelDownloadUrl(activeModel.id);

  apiFormData.append("model_url_or_path", activeModelPath);
  apiFormData.append("confidence", confidence.toString());
  // Test-Time Augmentation ตั้งรายโมเดลในหน้าแอดมิน (AiModel.useTta)
  apiFormData.append("augment", activeModel.useTta ? "true" : "false");

  const response = await fetch(`${fastApiUrl}/predict`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
    },
    body: apiFormData,
    cache: "no-store", // ป้องกัน Next.js Cache ผลลัพธ์
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("FastAPI error:", errorText);
    throw new Error("การประมวลผลรูปภาพขัดข้องที่ระบบ AI");
  }

  const result: AnalysisResult = await response.json();
  return result;
}
