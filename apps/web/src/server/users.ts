import "server-only";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/http-error";
import { deleteImage } from "@/lib/storage/image-provider";

export async function deleteUserLogic(
  userIdToDelete: string,
  currentAdminId: string,
) {
  // Prevent self-deletion
  if (currentAdminId === userIdToDelete) {
    throw new HttpError(400, "คุณไม่สามารถลบบัญชีผู้ดูแลระบบของตัวเองได้");
  }

  // Find and delete associated image files
  const userAnalyses = await prisma.analysis.findMany({
    where: { userId: userIdToDelete },
    include: { image: true },
  });

  const imageIds: string[] = [];

  if (userAnalyses.length > 0) {
    for (const analysis of userAnalyses) {
      if (!analysis.image) continue;
      imageIds.push(analysis.image.id);
      try {
        await deleteImage(
          analysis.image.fileName,
          analysis.image.provider,
          analysis.image.url,
        );
      } catch (fsError) {
        console.error("Failed to delete user's image file:", fsError);
      }
    }
  }

  // Delete associated images from DB (cascades to Analysis)
  if (imageIds.length > 0) {
    await prisma.image.deleteMany({
      where: { id: { in: imageIds } },
    });
  }

  // Delete user (cascades to sessions, accounts, remaining analyses)
  await prisma.user.delete({
    where: { id: userIdToDelete },
  });
}

export async function deleteUsersLogic(
  userIdsToDelete: string[],
  currentAdminId: string,
) {
  // Prevent self-deletion by filtering it out
  const idsToDelete = userIdsToDelete.filter((id) => id !== currentAdminId);

  if (idsToDelete.length === 0) {
    throw new HttpError(
      400,
      "ไม่มีผู้ใช้ที่สามารถลบได้ (คุณไม่สามารถลบตัวเองได้)",
    );
  }

  // Find and delete associated image files for all users
  const userAnalyses = await prisma.analysis.findMany({
    where: { userId: { in: idsToDelete } },
    include: { image: true },
  });

  const imageIds: string[] = [];

  if (userAnalyses.length > 0) {
    for (const analysis of userAnalyses) {
      if (!analysis.image) continue;
      imageIds.push(analysis.image.id);
      try {
        await deleteImage(
          analysis.image.fileName,
          analysis.image.provider,
          analysis.image.url,
        );
      } catch (fsError) {
        console.error("Failed to delete user's image file:", fsError);
      }
    }
  }

  // Delete associated images from DB (cascades to Analysis)
  if (imageIds.length > 0) {
    await prisma.image.deleteMany({
      where: { id: { in: imageIds } },
    });
  }

  // Delete users (cascade deletes sessions, accounts, remaining analyses)
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
