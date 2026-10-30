import { apiRequest } from "./request";

export const UserService = {
  /** ลบผู้ใช้ (พร้อมประวัติและรูป) — DELETE /api/users/[id] */
  deleteUser: (id: string) =>
    apiRequest(`/api/users/${id}`, {
      method: "DELETE",
      fallbackError: "เกิดข้อผิดพลาดในการลบผู้ใช้งาน",
    }),

  /** ลบผู้ใช้หลายคน — DELETE /api/users */
  deleteUsers: (ids: string[]) =>
    apiRequest<{ count: number }>("/api/users", {
      method: "DELETE",
      body: { ids },
      fallbackError: "เกิดข้อผิดพลาดในการลบกลุ่มผู้ใช้งาน",
    }),
};
