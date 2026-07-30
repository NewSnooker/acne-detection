import { prisma } from "@/lib/prisma";

export async function getUsers(
  limit: number = 10,
  skip: number = 0,
  search?: string,
  sort: string = "date_desc"
) {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  let orderBy: any = { createdAt: "desc" };
  if (sort === "date_asc") orderBy = { createdAt: "asc" };
  else if (sort === "analyses_desc") orderBy = { analyses: { _count: "desc" } };
  else if (sort === "analyses_asc") orderBy = { analyses: { _count: "asc" } };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        _count: {
          select: { analyses: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total };
}

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
