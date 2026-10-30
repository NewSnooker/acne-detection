import { apiRequest } from "./request";

export const AuthService = {
  /** สมัครสมาชิก — POST /api/account/register (ไม่ใช้ /api/auth/ เพราะ Auth.js ใช้ path นั้น) */
  register: (formData: FormData) =>
    apiRequest("/api/account/register", {
      method: "POST",
      body: Object.fromEntries(formData.entries()),
      fallbackError: "เกิดข้อผิดพลาดในการสมัครสมาชิก",
    }),
};
