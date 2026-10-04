import { prisma } from "@/lib/prisma";
export async function getAllUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { analyses: true },
      },
    },
  });

  return users;
}
