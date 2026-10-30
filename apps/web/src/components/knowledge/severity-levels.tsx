import { ACNE_CARE_ADVICE, SEVERITY_LABELS } from "@/types/analyze";
import { cn } from "@/lib/utils";
import { SEVERITY_INFO } from "./content";

// ระดับความรุนแรง 3 ระดับ — showAdvice = แสดงคำแนะนำเดียวกับหน้าผลวิเคราะห์
export function SeverityLevels({
  showAdvice = false,
}: {
  showAdvice?: boolean;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {SEVERITY_INFO.map((level) => (
        <article
          key={level.key}
          className={cn("flex flex-col gap-3 rounded-2xl p-6", level.tone)}
        >
          <span className="text-sm font-semibold">{level.en}</span>
          <h3 className="text-foreground text-2xl">
            {SEVERITY_LABELS[level.key].label}
          </h3>
          <p className="text-foreground text-sm leading-relaxed">
            <span className="font-semibold">เกณฑ์: </span>
            {level.criteria}
          </p>
          {showAdvice && (
            <p className="text-foreground/80 text-sm leading-relaxed">
              {ACNE_CARE_ADVICE[level.key].replace("⚠️ ", "")}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
