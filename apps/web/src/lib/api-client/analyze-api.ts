import type { AnalysisResult } from "@/types/analyze";
import { apiRequest } from "./request";

export const AnalyzeService = {
  /** ส่งรูปไปวิเคราะห์ (อัปโหลด → AI → บันทึก) — POST /api/analyze */
  analyzeImage: (formData: FormData) =>
    apiRequest<{ data: AnalysisResult }>("/api/analyze", {
      method: "POST",
      body: formData,
      fallbackError: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
      tooLargeError:
        "ไฟล์รูปภาพใหญ่เกินกว่าที่เซิร์ฟเวอร์รับได้ กรุณาเลือกไฟล์ที่เล็กลง",
    }),

  /** ลบประวัติหลายรายการ — DELETE /api/analyze/history */
  deleteHistories: (ids: string[]) =>
    apiRequest("/api/analyze/history", {
      method: "DELETE",
      body: { ids },
      fallbackError: "ลบประวัติไม่สำเร็จ",
    }),
};
