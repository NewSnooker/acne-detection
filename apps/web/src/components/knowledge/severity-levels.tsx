import { ACNE_CARE_ADVICE, SEVERITY_LABELS } from "@/types/analyze";
import { SEVERITY_INFO } from "./content";

// ระดับความรุนแรง 3 ระดับ — showAdvice = แสดงคำแนะนำเดียวกับหน้าผลวิเคราะห์
export function SeverityLevels({ showAdvice = false }: { showAdvice?: boolean }) {
  return (
    <ol className="grid gap-4 md:grid-cols-3">
      {SEVERITY_INFO.map((level, i) => (
        <li key={level.key} className="flex flex-col gap-3 rounded-3xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${level.tone}`}>{level.en}</span>
            <span className="text-sm tabular-nums text-muted-foreground">0{i + 1}</span>
          </div>
          <h3 className="text-2xl">{SEVERITY_LABELS[level.key].label}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{level.criteria}</p>
          {showAdvice && (
            <p className="border-t pt-3 text-sm leading-relaxed">{ACNE_CARE_ADVICE[level.key].replace("⚠️ ", "")}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
