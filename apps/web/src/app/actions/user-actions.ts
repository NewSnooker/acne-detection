"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { deleteImage } from "@/lib/storage/image-provider";

export async function deleteUser(userIdToDelete: string) {
  try {
    const session = await auth();

    // 1. Check if user is logged in and is ADMIN
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    // 2. Prevent self-deletion
    if (session.user.id === userIdToDelete) {
      return { error: "คุณไม่สามารถลบบัญชีผู้ดูแลระบบของตัวเองได้" };
    }

    // 3. Find and delete associated image files
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
          await deleteImage(analysis.image.fileName, analysis.image.provider);
        } catch (fsError) {
          console.error("Failed to delete user's image file:", fsError);
        }
      }
    }

    // 4. Delete associated images from DB (cascades to Analysis)
    if (imageIds.length > 0) {
      await prisma.image.deleteMany({
        where: { id: { in: imageIds } },
      });
    }

    // 5. Delete user (cascades to sessions, accounts, remaining analyses)
    await prisma.user.delete({
      where: { id: userIdToDelete },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { error: "เกิดข้อผิดพลาดในการลบผู้ใช้งาน" };
  }
}

export async function deleteUsers(userIdsToDelete: string[]) {
  try {
    const session = await auth();

    // 1. Check if user is logged in and is ADMIN
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    // 2. Prevent self-deletion by filtering it out
    const idsToDelete = userIdsToDelete.filter(id => id !== session.user.id);
    
    if (idsToDelete.length === 0) {
      return { error: "ไม่มีผู้ใช้ที่สามารถลบได้ (คุณไม่สามารถลบตัวเองได้)" };
    }

    // 3. Find and delete associated image files for all users
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
          await deleteImage(analysis.image.fileName, analysis.image.provider);
        } catch (fsError) {
          console.error("Failed to delete user's image file:", fsError);
        }
      }
    }

    // 4. Delete associated images from DB (cascades to Analysis)
    if (imageIds.length > 0) {
      await prisma.image.deleteMany({
        where: { id: { in: imageIds } },
      });
    }

    // 5. Delete users (cascade deletes sessions, accounts, remaining analyses)
    await prisma.user.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    revalidatePath("/admin/users");
    return { success: true, count: idsToDelete.length };
  } catch (error) {
    console.error("Error deleting users:", error);
    return { error: "เกิดข้อผิดพลาดในการลบผู้ใช้งาน" };
  }
}
