export const AuthService = {
  /**
   * สมัครสมาชิกใหม่
   * ยิงไปที่: POST /api/account/register
   * (ไม่ใช้ /api/auth/ เพราะ NextAuth ยึดครอง path นั้น)
   */
  register: async (formData: FormData): Promise<{ success?: boolean; error?: string }> => {
    try {
      const data = Object.fromEntries(formData.entries());
      const response = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to register");
      return result;
    } catch (error: any) {
      console.error("AuthService Error (register):", error);
      return { error: error.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก" };
    }
  }
};
