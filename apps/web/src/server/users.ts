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
  await deleteUsersLogic([userIdToDelete], currentAdminId);
}

/** ลบผู้ใช้พร้อมรูปและประวัติ (ข้ามบัญชีของแอดมินที่กดลบ) — คืนจำนวนผู้ใช้ที่ลบ */
export async function deleteUsersLogic(
  userIdsToDelete: string[],
  currentAdminId: string,
) {
  const idsToDelete = userIdsToDelete.filter((id) => id !== currentAdminId);
  if (idsToDelete.length === 0) {
    throw new HttpError(
      400,
      "ไม่มีผู้ใช้ที่สามารถลบได้ (คุณไม่สามารถลบตัวเองได้)",
    );
  }

  await deleteAnalysesWhere({ userId: { in: idsToDelete } });

  // cascade ลบ sessions, accounts ต่อ
  await prisma.user.deleteMany({
    where: { id: { in: idsToDelete } },
  });
  return idsToDelete.length;
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
