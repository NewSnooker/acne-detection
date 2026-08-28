export const ModelService = {
  /**
   * อัปโหลดไฟล์โมเดล (.pt) ใหม่เข้าระบบ
   * ยิงไปที่: POST /api/models/create
   */
  uploadModel: async (formData: FormData): Promise<{ success?: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/models/create", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to upload model");
      return result;
    } catch (error: any) {
      console.error("ModelService Error (uploadModel):", error);
      return { error: error.message || "เกิดข้อผิดพลาดในการอัปโหลดโมเดล" };
    }
  },

  /**
   * เปิด/ปิด การใช้งานโมเดล (Set Active/Inactive)
   * ยิงไปที่: PUT /api/models/[id]
   */
  toggleModelActive: async (id: string): Promise<{ success?: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/models/${id}`, {
        method: "PUT",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to toggle model active state");
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
  deleteModel: async (id: string): Promise<{ success?: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/models/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete model");
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
  deleteModels: async (ids: string[]): Promise<{ success?: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/models`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete models");
      return result;
    } catch (error: any) {
      console.error("ModelService Error (deleteModels):", error);
      return { error: error.message || "เกิดข้อผิดพลาดในการลบโมเดล" };
    }
  },

  /**
   * แก้ไขข้อมูลโมเดล (ชื่อ, เวอร์ชั่น, คำอธิบาย)
   * ยิงไปที่: PUT /api/models/[id]/edit
   */
  editModel: async (id: string, data: { name: string; version: string; description?: string }): Promise<{ success?: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/models/${id}/edit`, {
        method: "PUT",
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
  }
};
