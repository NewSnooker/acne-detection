import "server-only";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/http-error";
import { deleteAnalysesWhere } from "@/server/history";

export async function deleteUserLogic(
  userIdToDelete: string,
  currentAdminId: string,
) {
  if (currentAdminId === userIdToDelete) {
    throw new HttpError(400, "คุณไม่สามารถลบบัญชีผู้ดูแลระบบของตัวเองได้");
  }
  const user = await prisma.user.findUnique({
    where: { id: userIdToDelete },
    select: { role: true },
  });
  if (!user) throw new HttpError(404, "ไม่พบผู้ใช้งาน");
  if (user.role === "ADMIN") {
    throw new HttpError(403, "ลบบัญชีผู้ดูแลระบบไม่ได้");
  }
  await deleteUsersLogic([userIdToDelete], currentAdminId);
}

/**
 * ลบผู้ใช้ทั่วไปพร้อมรูปและประวัติ — ข้ามบัญชีของตัวเองและบัญชีผู้ดูแลระบบ (ตรวจที่ server ไม่พึ่ง UI)
 * คืนจำนวนผู้ใช้ที่ลบ
 */
export async function deleteUsersLogic(
  userIdsToDelete: string[],
  currentAdminId: string,
) {
  const deletable = await prisma.user.findMany({
    where: {
      id: { in: userIdsToDelete.filter((id) => id !== currentAdminId) },
      role: "USER",
    },
    select: { id: true },
  });
  const idsToDelete = deletable.map((u) => u.id);
  if (idsToDelete.length === 0) {
    throw new HttpError(
      400,
      "ไม่มีผู้ใช้ที่ลบได้ (ลบบัญชีของตัวเองและบัญชีผู้ดูแลระบบไม่ได้)",
    );
  }

  await deleteAnalysesWhere({ userId: { in: idsToDelete } });

  // role: "USER" ซ้ำอีกชั้น กันกรณีถูกตั้งเป็นแอดมินระหว่างลบ — cascade ลบ sessions, accounts ต่อ
  const { count } = await prisma.user.deleteMany({
    where: { id: { in: idsToDelete }, role: "USER" },
  });
  return count;
}

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
