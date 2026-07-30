"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
      select: { originalImage: true },
    });

    if (userAnalyses.length > 0) {
      const fs = await import("fs");
      const path = await import("path");
      
      let storagePath = process.env.STORAGE_PATH;
      if (!storagePath || !path.isAbsolute(storagePath)) {
        const cwd = process.cwd();
        if (cwd.endsWith("web")) {
          storagePath = path.resolve(cwd, "..", "..", "apps", "storage", "uploads");
        } else {
          storagePath = path.resolve(cwd, "apps", "storage", "uploads");
        }
      }

      for (const analysis of userAnalyses) {
        try {
          const imagePath = path.join(storagePath, analysis.originalImage);
          if (fs.existsSync(imagePath)) {
            await fs.promises.unlink(imagePath);
          }
        } catch (fsError) {
          console.error("Failed to delete user's image file:", fsError);
        }
      }
    }

    // 4. Delete user (this will cascade and delete their analyses, sessions, accounts from DB)
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
      select: { originalImage: true },
    });

    if (userAnalyses.length > 0) {
      const fs = await import("fs");
      const path = await import("path");
      
      let storagePath = process.env.STORAGE_PATH;
      if (!storagePath || !path.isAbsolute(storagePath)) {
        const cwd = process.cwd();
        if (cwd.endsWith("web")) {
          storagePath = path.resolve(cwd, "..", "..", "apps", "storage", "uploads");
        } else {
          storagePath = path.resolve(cwd, "apps", "storage", "uploads");
        }
      }

      for (const analysis of userAnalyses) {
        try {
          const imagePath = path.join(storagePath, analysis.originalImage);
          if (fs.existsSync(imagePath)) {
            await fs.promises.unlink(imagePath);
          }
        } catch (fsError) {
          console.error("Failed to delete user's image file:", fsError);
        }
      }
    }

    // 4. Delete users (cascade deletes DB records)
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
