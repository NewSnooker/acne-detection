import { apiRequest, uploadWithProgress } from "./request";

export const ModelService = {
  /**
   * อัปโหลดไฟล์โมเดล (.pt) — POST /api/models (body = ไฟล์, ข้อมูลโมเดลอยู่ใน query)
   * ขนาดสูงสุดขึ้นกับที่เก็บของระบบนั้น (ดู dev-docs/environments.md)
   */
  uploadModel: (
    file: File,
    info: { name: string; version: string; description: string },
    onProgress?: (fraction: number) => void,
  ) =>
    uploadWithProgress<{ model: { id: string } }>(
      `/api/models?${new URLSearchParams({ fileName: file.name, ...info })}`,
      file,
      {
        onProgress,
        fallbackError: "เกิดข้อผิดพลาดในการอัปโหลดโมเดล",
        tooLargeError:
          "ไฟล์ใหญ่เกินกว่าที่เซิร์ฟเวอร์นี้รับได้ — อัปโหลดโมเดลใหญ่ผ่านระบบที่รันด้วย Docker หรือ Azure",
      },
    ),

  /** อ่านค่าประเมินจากผลเทรนในไฟล์ .pt แล้วบันทึก — POST /api/models/[id]/metrics */
  importMetrics: (id: string) =>
    apiRequest<{ metrics: Partial<Record<string, number>> }>(
      `/api/models/${id}/metrics`,
      {
        method: "POST",
        fallbackError: "อ่านค่าประเมินจากไฟล์โมเดลไม่สำเร็จ",
      },
    ),

  /** ตั้งเป็นโมเดลหลัก — POST /api/models/[id]/activate */
  toggleModelActive: (id: string) =>
    apiRequest(`/api/models/${id}/activate`, {
      method: "POST",
      fallbackError: "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ",
    }),

  /** ลบโมเดล 1 ตัว (ลบโมเดลหลักไม่ได้) — DELETE /api/models/[id] */
  deleteModel: (id: string) =>
    apiRequest(`/api/models/${id}`, {
      method: "DELETE",
      fallbackError: "เกิดข้อผิดพลาดในการลบโมเดล",
    }),

  /** ลบหลายตัว (ข้ามโมเดลหลัก) — DELETE /api/models */
  deleteModels: (ids: string[]) =>
    apiRequest<{ count: number }>("/api/models", {
      method: "DELETE",
      body: { ids },
      fallbackError: "เกิดข้อผิดพลาดในการลบโมเดล",
    }),

  /** แก้ชื่อ เวอร์ชัน รายละเอียด และค่าประเมิน — PATCH /api/models/[id] */
  editModel: (id: string, data: Record<string, string>) =>
    apiRequest(`/api/models/${id}`, {
      method: "PATCH",
      body: data,
      fallbackError: "เกิดข้อผิดพลาดในการแก้ไขโมเดล",
    }),
};
