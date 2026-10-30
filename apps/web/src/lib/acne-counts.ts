import type { Prisma } from "@prisma/client";

/** อ่าน Analysis.counts (Json) เป็น { ชนิดสิว: จำนวน } — ข้ามค่าที่ไม่ใช่ตัวเลข */
export function readCounts(
  counts: Prisma.JsonValue | undefined,
): Record<string, number> {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) return {};
  const result: Record<string, number> = {};
  for (const [type, value] of Object.entries(counts)) {
    if (typeof value === "number") result[type] = value;
  }
  return result;
}
