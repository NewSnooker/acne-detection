import {
  ACNE_CARE_ADVICE,
  ACNE_COLORS,
  ACNE_LABELS,
  SEVERITY_LABELS,
  type AnalysisResult,
} from "@/types/analyze";
import {
  explainSeverity,
  type AcneGroupId,
  type SeverityLevel,
} from "@/lib/acne-groups";
import { cn } from "@/lib/utils";

// พื้นกล่องระดับความรุนแรง — เข้มกว่ากล่องกลุ่มด้านล่าง
const LEVEL_BG: Record<SeverityLevel, string> = {
  MILD: "bg-emerald-500/15",
  MODERATE: "bg-amber-500/15",
  SEVERE: "bg-destructive/15",
};

// พื้นกล่องกลุ่ม: แดงไล่จากอักเสบลึก (เข้มสุด) ไปไม่อักเสบ (จางสุด)
const GROUP_BG: Record<AcneGroupId, string> = {
  deep: "bg-destructive/10",
  shallow: "bg-destructive/6",
  non: "bg-destructive/3",
};

// สรุปผลแบบกระชับใต้ภาพหลัก ให้ทั้งการ์ดพอดีหนึ่งหน้าจอ
export function HeroResult({
  counts,
  severity,
}: {
  counts: Record<string, number>;
  severity: AnalysisResult["severity"];
}) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const { groups } = explainSeverity(counts);
  const level = SEVERITY_LABELS[severity];

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className={cn("rounded-xl px-4 py-3", LEVEL_BG[severity])}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-xs">ระดับความรุนแรง</p>
            <p className={cn("text-xl font-bold", level.color)}>
              {level.label}
            </p>
          </div>
          <p className="text-xl font-bold tabular-nums">
            {total}
            <span className="text-muted-foreground ml-1 text-xs font-medium">
              จุด
            </span>
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-3 gap-2">
        {groups.map((g) => (
          <li
            key={g.id}
            className={cn(
              "flex flex-col gap-1 rounded-xl px-3 py-2",
              GROUP_BG[g.id],
            )}
          >
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xs font-semibold">{g.name}</span>
              <span className="text-base font-bold tabular-nums">
                {g.count}
              </span>
            </div>
            {g.types.map((t) => (
              <span
                key={t.type}
                className={cn(
                  "text-muted-foreground flex items-center gap-1.5 text-[11px]",
                  t.count === 0 && "opacity-40",
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: ACNE_COLORS[t.type] }}
                />
                {(ACNE_LABELS[t.type] ?? t.type).replace(/^สิว/, "")}
                <span className="ml-auto tabular-nums">{t.count}</span>
              </span>
            ))}
          </li>
        ))}
      </ul>

      <p className="text-foreground/80 line-clamp-2 text-xs leading-relaxed">
        <span className="text-foreground font-semibold">คำแนะนำ: </span>
        {ACNE_CARE_ADVICE[severity]}
      </p>
    </div>
  );
}
