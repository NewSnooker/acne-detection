import { prisma } from "@/lib/prisma";

// เลือกเฉพาะฟิลด์ที่ตารางใช้ — ห้ามส่ง password (hash) ไปถึงเบราว์เซอร์
export const ADMIN_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  createdAt: true,
  _count: { select: { analyses: true } },
} as const;

export async function getAllUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: ADMIN_USER_SELECT,
  });
}
