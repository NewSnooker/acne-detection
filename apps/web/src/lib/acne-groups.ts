// จัดกลุ่มสิว 3 กลุ่ม และอธิบายว่าทำไมได้ระดับความรุนแรงนั้น (ใช้ได้ทั้ง client และ server)
// เกณฑ์ต้องตรงกับ calculateSeverity() ใน server/analyze.ts และเล่มข้อ 1.3.3.5 — มีเทสต์เทียบกันอยู่

export type AcneGroupId = "deep" | "shallow" | "non";
export type SeverityLevel = "MILD" | "MODERATE" | "SEVERE";

export const ACNE_GROUPS: {
  id: AcneGroupId;
  name: string;
  types: [string, string];
}[] = [
  { id: "deep", name: "อักเสบลึก", types: ["nodule", "cyst"] },
  { id: "shallow", name: "อักเสบตื้น", types: ["papule", "pustule"] },
  { id: "non", name: "ไม่อักเสบ", types: ["blackhead", "whitehead"] },
];

const GROUP_OF: Record<string, AcneGroupId> = Object.fromEntries(
  ACNE_GROUPS.flatMap((g) => g.types.map((t) => [t, g.id])),
);

export function groupOfType(type: string): AcneGroupId | null {
  return GROUP_OF[type] ?? null;
}

const RANK: Record<SeverityLevel, number> = { MILD: 0, MODERATE: 1, SEVERE: 2 };
const GROUP_RANK: Record<AcneGroupId, number> = { deep: 2, shallow: 1, non: 0 };

export interface GroupSummary {
  id: AcneGroupId;
  name: string;
  types: { type: string; count: number }[];
  count: number;
  /** ระดับที่กลุ่มนี้อยู่ตามเกณฑ์ */
  level: SeverityLevel;
  /** กลุ่มนี้เป็นเหตุผลของระดับรวม */
  decisive: boolean;
  /** เกณฑ์ข้อที่ตรงกับจำนวนตอนนี้ เช่น "6–20 จุด = ปานกลาง" */
  rule: string;
}

export interface SeverityExplanation {
  level: SeverityLevel;
  /** เหตุผลสั้นๆ เช่น "เพราะพบสิวอักเสบลึก 1 จุด (ตั้งแต่ 1 จุด = รุนแรง)" */
  reason: string;
  /** เรียง: กลุ่มที่เป็นเหตุผล → กลุ่มที่พบ → กลุ่มที่เป็น 0, เสมอกันเรียง ลึก → ตื้น → ไม่อักเสบ */
  groups: GroupSummary[];
}

function groupLevelAndRule(
  id: AcneGroupId,
  n: number,
): { level: SeverityLevel; rule: string; why: string } {
  if (id === "deep") {
    return n >= 1
      ? {
          level: "SEVERE",
          rule: "พบตั้งแต่ 1 จุด = รุนแรง",
          why: `พบสิวอักเสบลึก ${n} จุด (ตั้งแต่ 1 จุด = รุนแรง)`,
        }
      : { level: "MILD", rule: "ไม่พบ", why: "" };
  }
  if (id === "shallow") {
    if (n > 20)
      return {
        level: "SEVERE",
        rule: "เกิน 20 จุด = รุนแรง",
        why: `พบสิวอักเสบตื้น ${n} จุด (เกิน 20 จุด = รุนแรง)`,
      };
    if (n >= 6)
      return {
        level: "MODERATE",
        rule: "6–20 จุด = ปานกลาง",
        why: `พบสิวอักเสบตื้น ${n} จุด (6–20 จุด = ปานกลาง)`,
      };
    return { level: "MILD", rule: "ไม่เกิน 5 จุด = เล็กน้อย", why: "" };
  }
  return n > 20
    ? {
        level: "MODERATE",
        rule: "เกิน 20 จุด = ปานกลาง",
        why: `พบสิวไม่อักเสบ ${n} จุด (เกิน 20 จุด = ปานกลาง)`,
      }
    : { level: "MILD", rule: "ไม่เกิน 20 จุด = เล็กน้อย", why: "" };
}

export function explainSeverity(
  counts: Record<string, number>,
): SeverityExplanation {
  const base = ACNE_GROUPS.map((g) => {
    const types = g.types.map((type) => ({ type, count: counts[type] || 0 }));
    const count = types.reduce((sum, t) => sum + t.count, 0);
    return { ...g, types, count, ...groupLevelAndRule(g.id, count) };
  });

  const level = base.reduce<SeverityLevel>(
    (max, g) => (RANK[g.level] > RANK[max] ? g.level : max),
    "MILD",
  );

  const groups: GroupSummary[] = base
    .map(({ why: _why, ...g }) => ({
      ...g,
      decisive: level !== "MILD" && g.level === level,
    }))
    .sort((a, b) => {
      if (a.decisive !== b.decisive) return a.decisive ? -1 : 1;
      if (a.count > 0 !== b.count > 0) return a.count > 0 ? -1 : 1;
      return GROUP_RANK[b.id] - GROUP_RANK[a.id];
    });

  const reasons = base
    .filter((g) => level !== "MILD" && g.level === level)
    .map((g) => g.why);

  const reason =
    level === "MILD"
      ? "ทุกกลุ่มอยู่ในเกณฑ์เล็กน้อย (ไม่อักเสบไม่เกิน 20 จุด และอักเสบตื้นไม่เกิน 5 จุด)"
      : `เพราะ${reasons.join(" และ")}`;

  return { level, reason, groups };
}
