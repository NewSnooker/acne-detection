export const ModelService = {
  /**
   * อัปโหลดไฟล์โมเดล (.pt) ใหม่เข้าระบบ
   * ยิงไปที่: POST /api/models
   */
  uploadModel: async (
    formData: FormData,
  ): Promise<{ success?: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/models", {
        method: "POST",
        body: formData,
      });
      // 413 = ผู้ให้บริการปฏิเสธคำขอเพราะไฟล์ใหญ่เกิน (ดู dev-docs/limitations.md)
      if (response.status === 413) {
        throw new Error(
          "ไฟล์ใหญ่เกินกว่าที่เซิร์ฟเวอร์นี้รับได้ (บน Vercel รับได้ไม่เกินประมาณ 4.5 MB)",
        );
      }
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to upload model");
      return result;
    } catch (error: any) {
      console.error("ModelService Error (uploadModel):", error);
      return { error: error.message || "เกิดข้อผิดพลาดในการอัปโหลดโมเดล" };
    }
  },

  /**
   * เปิด/ปิด การใช้งานโมเดล (Set Active/Inactive)
   * ยิงไปที่: POST /api/models/[id]/activate
   */
  toggleModelActive: async (
    id: string,
  ): Promise<{ success?: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/models/${id}/activate`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to toggle model active state");
      return result;
    } catch (error: any) {
      console.error("ModelService Error (toggleModelActive):", error);
      return { error: error.message || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ" };
    }
  },

  /**
   * ลบโมเดลออกจากระบบ (รวมถึงไฟล์ Binary ในฐานข้อมูล)
   * ยิงไปที่: DELETE /api/models/[id]
   */
  deleteModel: async (
    id: string,
  ): Promise<{ success?: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/models/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to delete model");
      return result;
    } catch (error: any) {
      console.error("ModelService Error (deleteModel):", error);
      return { error: error.message || "เกิดข้อผิดพลาดในการลบโมเดล" };
    }
  },

  /**
   * ลบโมเดลแบบกลุ่ม
   * ยิงไปที่: DELETE /api/models
   */
  deleteModels: async (
    ids: string[],
  ): Promise<{ success?: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/models`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to delete models");
      return result;
    } catch (error: any) {
      console.error("ModelService Error (deleteModels):", error);
      return { error: error.message || "เกิดข้อผิดพลาดในการลบโมเดล" };
    }
  },

  /**
   * แก้ไขข้อมูลโมเดล (ชื่อ, เวอร์ชั่น, คำอธิบาย)
   * ยิงไปที่: PATCH /api/models/[id]
   */
  editModel: async (
    id: string,
    data: Record<string, string>,
  ): Promise<{ success?: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to edit model");
      return result;
    } catch (error: any) {
      console.error("ModelService Error (editModel):", error);
      return { error: error.message || "เกิดข้อผิดพลาดในการแก้ไขโมเดล" };
    }
  },
};
