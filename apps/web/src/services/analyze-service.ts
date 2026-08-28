import { AnalysisResult } from "@/types/analyze";

export const AnalyzeService = {
  /**
   * ส่งไฟล์รูปภาพไปวิเคราะห์สิว (Upload -> AI -> DB)
   * ยิงไปที่: POST /api/analyze
   */
  analyzeImage: async (formData: FormData): Promise<{ success?: boolean; data?: AnalysisResult; error?: string }> => {
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to analyze image");
      return result;
    } catch (error: any) {
      console.error("AnalyzeService Error (analyzeImage):", error);
      return { error: error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
  },

  /**
   * ลบประวัติการวิเคราะห์ 1 รายการ
   * ยิงไปที่: DELETE /api/analyze/history
   */
  deleteHistory: async (id: string): Promise<{ success?: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/analyze/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete history");
      return result;
    } catch (error: any) {
      console.error("AnalyzeService Error (deleteHistory):", error);
      return { error: error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
  },

  /**
   * ลบประวัติการวิเคราะห์ทีละหลายรายการ (Batch Delete)
   * ยิงไปที่: DELETE /api/analyze/history
   */
  deleteHistories: async (ids: string[]): Promise<{ success?: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/analyze/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete histories");
      return result;
    } catch (error: any) {
      console.error("AnalyzeService Error (deleteHistories):", error);
      return { error: error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
  }
};
