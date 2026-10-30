import { AnalysisResult } from "@/types/analyze";
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
export async function callFastApiForPrediction(
  imageResult: {
    originalImage: string;
    imageUrl?: string | null;
    imageProvider: string;
  },
  activeModelId: string,
): Promise<AnalysisResult> {
  const fastApiUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
  // key ต้องมาจาก env เท่านั้น (ใน Docker กำหนดไว้ที่ docker-compose.yml)
  const apiKey = process.env.AI_SERVICE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ระบบยังไม่ได้ตั้งค่า AI_SERVICE_API_KEY กรุณาติดต่อผู้ดูแลระบบ",
    );
  }
  const ACCURACY_THRESHOLD = process.env.AI_CONFIDENCE_THRESHOLD
    ? parseFloat(process.env.AI_CONFIDENCE_THRESHOLD)
    : 0.25;

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
  const appUrl =
    process.env.INTERNAL_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const activeModelPath = `${appUrl}/api/models/${activeModelId}`;

  apiFormData.append("model_url_or_path", activeModelPath);
  apiFormData.append("confidence", ACCURACY_THRESHOLD.toString());

  console.log(
    `[FastAPI] image: ${apiFormData.get("image_url_or_path")} | model: ${activeModelPath}`,
  );

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
