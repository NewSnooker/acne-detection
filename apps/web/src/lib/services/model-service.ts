import { prisma } from "@/lib/prisma";

export async function getAdminModels() {
  return await prisma.aiModel.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { analyses: true },
      },
    },
  });
}

export async function getActiveModel() {
  return await prisma.aiModel.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
}
