import type { Prisma, Severity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteImage } from "@/lib/storage/image-provider";
import type { Detection } from "@/types/analyze";

export type HistorySort = "desc" | "asc" | "acne_desc" | "acne_asc";

export type HistoryQuery = {
  /** ไม่ระบุ = ประวัติของทุกคน (หน้าแอดมิน) และค้นหาด้วยชื่อ/อีเมลผู้ใช้ได้ */
  userId?: string;
  sort?: string;
  search?: string;
  /** YYYY-MM-DD */
  date?: string;
  /** ชนิดสิว หรือ "no_acne" */
  types?: string[];
  limit?: number;
  skip?: number;
};

/** ฟิลด์ที่ตัวกรองใช้ — แยกออกมาเพื่อทดสอบได้โดยไม่ต้องมีฐานข้อมูล */
export type FilterableAnalysis = {
  counts: Prisma.JsonValue;
  total: number;
  severity: Severity;
  createdAt: Date;
  model: { name: string; version: string } | null;
  user?: { name: string | null; email: string } | null;
};

const SEVERITY_SEARCH_TERMS: Record<Severity, string> = {
  MILD: "mild เล็กน้อย น้อย",
  MODERATE: "moderate ปานกลาง",
  SEVERE: "severe รุนแรง มาก",
};

const ORDER_BY: Record<HistorySort, Prisma.AnalysisOrderByWithRelationInput> = {
  desc: { createdAt: "desc" },
  asc: { createdAt: "asc" },
  acne_desc: { total: "desc" },
  acne_asc: { total: "asc" },
};

export function toOrderBy(sort?: string) {
  return ORDER_BY[sort as HistorySort] ?? ORDER_BY.desc;
}

export function readCounts(counts: Prisma.JsonValue): Record<string, number> {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) return {};
  const result: Record<string, number> = {};
  for (const [type, value] of Object.entries(counts)) {
    if (typeof value === "number") result[type] = value;
  }
  return result;
}

/** จำนวน "รูป" ที่พบสิวแต่ละชนิด (รูปเดียวนับ 1 ต่อชนิด) และรูปที่ไม่พบสิว */
export function countImagesByType(
  items: Pick<FilterableAnalysis, "counts" | "total">[],
) {
  const typeCounts: Record<string, number> = {};
  for (const item of items) {
    if (item.total === 0) {
      typeCounts.no_acne = (typeCounts.no_acne || 0) + 1;
      continue;
    }
    for (const [type, count] of Object.entries(readCounts(item.counts))) {
      if (count > 0) typeCounts[type] = (typeCounts[type] || 0) + 1;
    }
  }
  return typeCounts;
}

function matchesSearch(item: FilterableAnalysis, search: string) {
  const term = search.toLowerCase();
  const counts = readCounts(item.counts);
  const dateObj = new Date(item.createdAt);

  const haystack = [
    ...Object.keys(counts).filter((type) => counts[type] > 0),
    item.model?.name,
    item.model?.version,
    item.user?.name,
    item.user?.email,
    SEVERITY_SEARCH_TERMS[item.severity],
    item.total.toString(),
    dateObj.toISOString().split("T")[0], // YYYY-MM-DD
    dateObj.toLocaleDateString("en-GB"), // DD/MM/YYYY
  ];
  return haystack.some((value) => value?.toLowerCase().includes(term));
}

function isOnDate(item: FilterableAnalysis, date: string) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const created = new Date(item.createdAt);
  return created >= start && created <= end;
}

function hasAnyType(item: FilterableAnalysis, types: string[]) {
  const counts = readCounts(item.counts);
  return types.some((type) =>
    type === "no_acne" ? item.total === 0 : (counts[type] ?? 0) > 0,
  );
}

export function filterHistory<T extends FilterableAnalysis>(
  items: T[],
  { search, date, types }: Pick<HistoryQuery, "search" | "date" | "types">,
) {
  return items.filter(
    (item) =>
      (!search || matchesSearch(item, search)) &&
      (!date || isOnDate(item, date)) &&
      (!types?.length || hasAnyType(item, types)),
  );
}

export async function getHistory({
  userId,
  sort,
  search,
  date,
  types,
  limit,
  skip = 0,
}: HistoryQuery) {
  const isAllUsers = userId === undefined;
  const rows = await prisma.analysis.findMany({
    where: isAllUsers ? undefined : { userId },
    orderBy: toOrderBy(sort),
    include: {
      model: { select: { name: true, version: true } },
      image: true,
      ...(isAllUsers && {
        user: { select: { id: true, name: true, email: true, image: true } },
      }),
    },
  });

  // typeCounts นับจากประวัติทั้งหมด (ก่อนกรอง) เพื่อแสดงตัวเลขข้างตัวเลือกชนิดสิว
  const typeCounts = countImagesByType(rows);
  const filtered = filterHistory(rows, { search, date, types });
  const page =
    limit === undefined
      ? filtered.slice(skip)
      : filtered.slice(skip, skip + limit);

  const items = page.map((item) => ({
    id: item.id,
    imageName: item.image?.fileName || "",
    imageUrl: item.image?.url || null,
    imageProvider: item.image?.provider || "local",
    detections: item.detections as unknown as Detection[],
    counts: readCounts(item.counts),
    total: item.total,
    severity: item.severity,
    createdAt: item.createdAt,
    model: item.model,
    ...(isAllUsers && { user: item.user }),
  }));

  return { items, total: filtered.length, typeCounts };
}

/** ลบประวัติ (ลบไฟล์รูปก่อน แล้วลบ Image ซึ่ง cascade ไปลบ Analysis) */
export async function deleteHistories(ids: string[]) {
  const analyses = await prisma.analysis.findMany({
    where: { id: { in: ids } },
    include: { image: true },
  });

  for (const { image } of analyses) {
    try {
      await deleteImage(image.fileName, image.provider, image.url);
    } catch (fsError) {
      console.error("Failed to delete image file:", fsError);
    }
  }

  await prisma.image.deleteMany({
    where: { id: { in: analyses.map((a) => a.image.id) } },
  });
  return analyses.length;
}
