import { prisma } from "@/lib/prisma";
import { Detection } from "@/types/analyze";

export async function getUserHistory(
  userId: string,
  limit: number = 10,
  skip: number = 0,
  sort: string = "desc",
  search?: string,
  date?: string,
  types?: string[],
) {
  let orderBy: any = { createdAt: "desc" };
  if (sort === "asc") orderBy = { createdAt: "asc" };
  else if (sort === "acne_desc") orderBy = { total: "desc" };
  else if (sort === "acne_asc") orderBy = { total: "asc" };

  // ดึงข้อมูลประวัติทั้งหมดของ User คนนี้เพื่อมาคำนวณและกรองใน Memory
  const allHistory = await prisma.analysis.findMany({
    where: { userId },
    orderBy,
    include: {
      model: {
        select: {
          name: true,
          version: true,
        },
      },
      image: true,
    },
  });

  // 1. คำนวณ typeCounts (จำนวน "รายการ/รูปภาพ" ที่พบสิวแต่ละประเภท)
  const typeCounts: Record<string, number> = {};
  for (const item of allHistory) {
    if (item.total === 0) {
      typeCounts["no_acne"] = (typeCounts["no_acne"] || 0) + 1;
    } else {
      const counts = (item.counts as Record<string, number>) || {};
      for (const [acneType, count] of Object.entries(counts)) {
        if (typeof count === "number" && count > 0) {
          // นับเป็น 1 รายการ ต่อ 1 รูปภาพที่เจอสิวประเภทนี้
          typeCounts[acneType] = (typeCounts[acneType] || 0) + 1;
        }
      }
    }
  }

  // 2. กรองข้อมูล (Filter)
  let filteredHistory = allHistory;

  if (search) {
    const searchLower = search.toLowerCase();
    filteredHistory = filteredHistory.filter((item) => {
      // 1. Search in Acne Types
      const counts = (item.counts as Record<string, number>) || {};
      const matchAcneType = Object.keys(counts).some(
        (type) => type.toLowerCase().includes(searchLower) && counts[type] > 0,
      );

      // 2. Search in Model Name/Version
      const modelName = (item as any).model?.name?.toLowerCase() || "";
      const modelVersion = (item as any).model?.version?.toLowerCase() || "";
      const matchModel =
        modelName.includes(searchLower) || modelVersion.includes(searchLower);

      // 3. Search in Severity (English and Thai)
      const severity = (item.severity || "").toLowerCase();
      let severityThai = "";
      if (severity === "mild") severityThai = "เล็กน้อย น้อย";
      if (severity === "moderate") severityThai = "ปานกลาง";
      if (severity === "severe") severityThai = "รุนแรง มาก";

      const matchSeverity =
        severity.includes(searchLower) || severityThai.includes(searchLower);

      // 4. Search in Total Count
      const matchTotal = item.total.toString().includes(searchLower);

      // 5. Search in Date (Format: YYYY-MM-DD and DD/MM/YYYY)
      const dateObj = new Date(item.createdAt);
      const isoDate = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
      const localDate = dateObj.toLocaleDateString("en-GB"); // DD/MM/YYYY
      const matchDate =
        isoDate.includes(searchLower) || localDate.includes(searchLower);

      return (
        matchAcneType || matchModel || matchSeverity || matchTotal || matchDate
      );
    });
  }

  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    filteredHistory = filteredHistory.filter((item) => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= startDate && itemDate <= endDate;
    });
  }

  if (types && types.length > 0) {
    filteredHistory = filteredHistory.filter((item) => {
      const counts = (item.counts as Record<string, number>) || {};
      // เช็คว่าในรูปนี้ มีสิวประเภทที่ตรงกับใน types อย่างน้อย 1 ประเภทหรือไม่
      return types.some((type) => {
        if (type === "no_acne") return item.total === 0;
        return counts[type] && counts[type] > 0;
      });
    });
  }

  const total = filteredHistory.length;

  // 3. แบ่งหน้า (Pagination)
  const paginatedHistory = filteredHistory.slice(skip, skip + limit);

  const items = paginatedHistory.map((item) => ({
    id: item.id,
    imageName: item.image?.fileName || "",
    imageUrl: item.image?.url || null,
    imageProvider: item.image?.provider || "local",
    detections: item.detections as unknown as Detection[],
    counts: item.counts as Record<string, number>,
    total: item.total,
    severity: item.severity as "MILD" | "MODERATE" | "SEVERE",
    createdAt: item.createdAt,
    model: (item as any).model,
  }));

  return { items, total, typeCounts };
}

export async function getAllHistory(
  limit: number = 10,
  skip: number = 0,
  sort: string = "desc",
  search?: string,
  date?: string,
  types?: string[],
) {
  let orderBy: any = { createdAt: "desc" };
  if (sort === "asc") orderBy = { createdAt: "asc" };
  else if (sort === "acne_desc") orderBy = { total: "desc" };
  else if (sort === "acne_asc") orderBy = { total: "asc" };

  // ดึงข้อมูลประวัติทั้งหมดในระบบมาคำนวณและกรองใน Memory
  const allHistory = await prisma.analysis.findMany({
    orderBy,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      model: {
        select: {
          name: true,
          version: true,
        },
      },
      image: true,
    },
  });

  // 1. คำนวณ typeCounts (จำนวน "รายการ/รูปภาพ" ที่พบสิวแต่ละประเภท)
  const typeCounts: Record<string, number> = {};
  for (const item of allHistory) {
    if (item.total === 0) {
      typeCounts["no_acne"] = (typeCounts["no_acne"] || 0) + 1;
    } else {
      const counts = (item.counts as Record<string, number>) || {};
      for (const [acneType, count] of Object.entries(counts)) {
        if (typeof count === "number" && count > 0) {
          // นับเป็น 1 รายการ ต่อ 1 รูปภาพที่เจอสิวประเภทนี้
          typeCounts[acneType] = (typeCounts[acneType] || 0) + 1;
        }
      }
    }
  }

  // 2. กรองข้อมูล (Filter)
  let filteredHistory = allHistory;

  if (search) {
    const searchLower = search.toLowerCase();
    filteredHistory = filteredHistory.filter((item) => {
      // 1. Search in Acne Types
      const counts = (item.counts as Record<string, number>) || {};
      const matchAcneType = Object.keys(counts).some(
        (type) => type.toLowerCase().includes(searchLower) && counts[type] > 0,
      );

      // 2. Search in User Name/Email (Admin only)
      const userName = item.user?.name?.toLowerCase() || "";
      const userEmail = item.user?.email?.toLowerCase() || "";
      const matchUser =
        userName.includes(searchLower) || userEmail.includes(searchLower);

      // 3. Search in Model Name/Version
      const modelName = (item as any).model?.name?.toLowerCase() || "";
      const modelVersion = (item as any).model?.version?.toLowerCase() || "";
      const matchModel =
        modelName.includes(searchLower) || modelVersion.includes(searchLower);

      // 4. Search in Severity (English and Thai)
      const severity = (item.severity || "").toLowerCase();
      let severityThai = "";
      if (severity === "mild") severityThai = "เล็กน้อย น้อย";
      if (severity === "moderate") severityThai = "ปานกลาง";
      if (severity === "severe") severityThai = "รุนแรง มาก";

      const matchSeverity =
        severity.includes(searchLower) || severityThai.includes(searchLower);

      // 5. Search in Total Count
      const matchTotal = item.total.toString().includes(searchLower);

      // 6. Search in Date (Format: YYYY-MM-DD and DD/MM/YYYY)
      const dateObj = new Date(item.createdAt);
      const isoDate = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
      const localDate = dateObj.toLocaleDateString("en-GB"); // DD/MM/YYYY
      const matchDate =
        isoDate.includes(searchLower) || localDate.includes(searchLower);

      return (
        matchAcneType ||
        matchUser ||
        matchModel ||
        matchSeverity ||
        matchTotal ||
        matchDate
      );
    });
  }

  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    filteredHistory = filteredHistory.filter((item) => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= startDate && itemDate <= endDate;
    });
  }

  if (types && types.length > 0) {
    filteredHistory = filteredHistory.filter((item) => {
      const counts = (item.counts as Record<string, number>) || {};
      return types.some((type) => {
        if (type === "no_acne") return item.total === 0;
        return counts[type] && counts[type] > 0;
      });
    });
  }

  const total = filteredHistory.length;

  // 3. แบ่งหน้า (Pagination)
  const paginatedHistory = filteredHistory.slice(skip, skip + limit);

  const items = paginatedHistory.map((item) => ({
    id: item.id,
    imageName: item.image?.fileName || "",
    imageUrl: item.image?.url || null,
    imageProvider: item.image?.provider || "local",
    detections: item.detections as unknown as Detection[],
    counts: item.counts as Record<string, number>,
    total: item.total,
    severity: item.severity as "MILD" | "MODERATE" | "SEVERE",
    createdAt: item.createdAt,
    user: item.user,
    model: (item as any).model,
  }));

  return { items, total, typeCounts };
}

import { deleteImage } from "@/lib/storage/image-provider";

export async function deleteHistoryLogic(id: string) {
  const analysis = await prisma.analysis.findUnique({
    where: { id },
    include: { image: true },
  });

  if (!analysis || !analysis.image) {
    throw new Error("Analysis or Image not found");
  }

  // 1. Delete the image file
  try {
    await deleteImage(
      analysis.image.fileName,
      analysis.image.provider,
      analysis.image.url,
    );
  } catch (fsError) {
    console.error("Failed to delete image file:", fsError);
    throw new Error("Failed to delete image file");
  }

  // 2. Delete the Image record from DB (this will cascade delete the Analysis record)
  await prisma.image.delete({
    where: { id: analysis.image.id },
  });
}

export async function deleteHistoriesLogic(ids: string[]) {
  const analyses = await prisma.analysis.findMany({
    where: { id: { in: ids } },
    include: { image: true },
  });

  // 1. Delete image files
  for (const analysis of analyses) {
    if (!analysis.image) continue;
    try {
      await deleteImage(
        analysis.image.fileName,
        analysis.image.provider,
        analysis.image.url,
      );
    } catch (fsError) {
      console.error("Failed to delete image file:", fsError);
    }
  }

  // 2. Delete Image records from DB (cascades to Analysis records)
  const imageIds = analyses.map((a) => a.image?.id).filter(Boolean) as string[];
  await prisma.image.deleteMany({
    where: { id: { in: imageIds } },
  });
}
