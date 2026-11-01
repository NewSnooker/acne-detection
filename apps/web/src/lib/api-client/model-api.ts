import { apiRequest, type ApiResult } from "./request";

export const ModelService = {
  /**
   * อัปโหลดไฟล์โมเดล (.pt) ไม่จำกัดขนาด — ส่งทีละชิ้น (≤ 4 MB) ผ่านเพดานของ Vercel ได้
   * POST /api/models → PUT /api/models/[id]/chunks/[i] ทุกชิ้น → POST /api/models/[id]/complete
   * ชิ้นที่ล้มลองใหม่ได้ 3 ครั้ง ถ้ายังไม่ได้จะลบโมเดลที่ค้างทิ้ง
   */
  uploadModel: async (
    file: File,
    info: { name: string; version: string; description: string },
    onProgress?: (fraction: number) => void,
  ): Promise<ApiResult<{ model: { id: string } }>> => {
    const started = await apiRequest<{
      model: { id: string; chunkCount: number };
      chunkSize: number;
    }>("/api/models", {
      method: "POST",
      body: { fileName: file.name, sizeBytes: file.size, ...info },
      fallbackError: "เกิดข้อผิดพลาดในการอัปโหลดโมเดล",
    });
    if (started.error || !started.model || !started.chunkSize) {
      return { error: started.error ?? "เกิดข้อผิดพลาดในการอัปโหลดโมเดล" };
    }

    const { id, chunkCount } = started.model;
    const chunkSize = started.chunkSize;
    for (let index = 0; index < chunkCount; index++) {
      const part = file.slice(index * chunkSize, (index + 1) * chunkSize);
      let result: ApiResult = {};
      for (let attempt = 0; attempt < 3; attempt++) {
        result = await apiRequest(`/api/models/${id}/chunks/${index}`, {
          method: "PUT",
          body: part,
          fallbackError: "อัปโหลดไฟล์ไม่สำเร็จ (เครือข่ายขัดข้อง)",
        });
        if (!result.error) break;
      }
      if (result.error) {
        await ModelService.deleteModel(id);
        return {
          error: `${result.error} — ชิ้นที่ ${index + 1}/${chunkCount}`,
        };
      }
      onProgress?.((index + 1) / chunkCount);
    }

    const completed = await apiRequest<{ model: { id: string } }>(
      `/api/models/${id}/complete`,
      { method: "POST", fallbackError: "ยืนยันการอัปโหลดโมเดลไม่สำเร็จ" },
    );
    if (completed.error) await ModelService.deleteModel(id);
    return completed;
  },

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
