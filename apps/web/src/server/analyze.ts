import "server-only";
import { AnalysisResult } from "@/types/analyze";
import path from "path";
import { getStoragePath, imageUrlForAi } from "@/lib/storage/image-provider";
import type { ImageStorage } from "@/lib/storage/config";
import {
  describeAiGap,
  parseServerTiming,
  type StepTimer,
} from "@/lib/request-log";

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
    imageProvider: ImageStorage;
  },
  activeModel: { id: string; useTta: boolean; confidence: number },
  log?: { timer: StepTimer; requestId: string },
): Promise<AnalysisResult> {
  const { url: fastApiUrl, apiKey } = getAiServiceConfig();

  const apiFormData = new FormData();

  const imageUrl = await imageUrlForAi(imageResult);
  if (imageUrl) {
    // Vercel Blob: URL สาธารณะ / Azure Blob: ลิงก์ SAS อายุสั้น — FastAPI ดาวน์โหลดเอง
    apiFormData.append("image_url_or_path", imageUrl);
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
  // ความมั่นใจขั้นต่ำและ Test-Time Augmentation ตั้งรายโมเดลในหน้าแก้ไขโมเดล
  apiFormData.append("confidence", activeModel.confidence.toString());
  apiFormData.append("augment", activeModel.useTta ? "true" : "false");

  // รวมเวลาที่ ai ทำงานทั้งหมด (โหลดรูป + โมเดล + inference) + เครือข่าย + ai ตื่นจาก scale-to-zero
  log?.timer.step("ai request");
  const response = await fetch(`${fastApiUrl}/predict`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      // id เดียวกับ log ของเว็บ — ai พิมพ์ไว้ใน "predict timing [<id>]"
      ...(log ? { "X-Request-ID": log.requestId } : {}),
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
  if (log) {
    // ai ส่งเวลาแต่ละขั้นมาใน Server-Timing → log ของเว็บบอกแค่เวลาที่หายไประหว่างทาง
    // (รายละเอียดขั้นของ ai ดูใน "predict timing [<id>]" ของ ai / DevTools)
    const aiTiming = parseServerTiming(response.headers.get("server-timing"));
    const note = describeAiGap(aiTiming, log.timer.elapsedInStep());
    if (note) log.timer.note(note);
    log.timer.addServerTiming(
      aiTiming.map((entry) => ({ ...entry, name: `ai-${entry.name}` })),
    );
  }
  return result;
}
