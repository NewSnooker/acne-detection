export const UserService = {
  /**
   * ลบผู้ใช้งาน (พร้อมประวัติและรูปภาพ)
   * ยิงไปที่: DELETE /api/users/[id]
   */
  deleteUser: async (id: string): Promise<{ success?: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete user");
      return result;
    } catch (error: any) {
      console.error("UserService Error (deleteUser):", error);
      return { error: error.message || "เกิดข้อผิดพลาดในการลบผู้ใช้งาน" };
    }
  },

  /**
   * ลบผู้ใช้งานแบบกลุ่ม (Batch Delete)
   * ยิงไปที่: DELETE /api/users
   */
  deleteUsers: async (ids: string[]): Promise<{ success?: boolean; error?: string; count?: number }> => {
    try {
      const response = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete users");
      return result;
    } catch (error: any) {
      console.error("UserService Error (deleteUsers):", error);
      return { error: error.message || "เกิดข้อผิดพลาดในการลบกลุ่มผู้ใช้งาน" };
    }
  }
};
