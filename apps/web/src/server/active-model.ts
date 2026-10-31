import "server-only";
import { prisma } from "@/lib/prisma";
import type { ActiveModelMetrics } from "@/components/knowledge/model-metrics";

// ค่าประเมินของโมเดลที่ใช้งานอยู่ สำหรับหน้าสาธารณะ
// ฐานข้อมูลล่มก็ยังเปิดหน้าได้ แค่ไม่มีตัวเลข (คืน null)
export function getActiveModelMetrics(): Promise<ActiveModelMetrics | null> {
  return prisma.aiModel
    .findFirst({
      where: { isActive: true },
      select: {
        name: true,
        version: true,
        mAP50: true,
        precision: true,
        recall: true,
        f1Score: true,
        accuracy: true,
      },
    })
    .catch(() => null);
}
