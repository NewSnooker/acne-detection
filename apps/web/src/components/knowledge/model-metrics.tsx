import { MODEL_METRICS, type ModelMetricKey } from "@/types/analyze";

export type ActiveModelMetrics = { name: string; version: string } & Record<ModelMetricKey, number | null>;

// ค่าประเมินของโมเดลที่ใช้งานอยู่ (ข้อ 1.3.3.3) — แอดมินกรอกในหน้าจัดการโมเดล
export function ModelMetrics({ model }: { model: ActiveModelMetrics | null }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {MODEL_METRICS.map(({ key, label, desc }) => {
          const value = model?.[key];
          return (
            <div key={key} className="flex flex-col gap-1 rounded-2xl border bg-card p-5 shadow-sm">
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
              <span className="text-3xl font-bold tabular-nums text-primary">
                {value != null ? `${value.toFixed(1)}%` : "—"}
              </span>
              <span className="text-xs leading-relaxed text-muted-foreground">{desc}</span>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        {model
          ? `วัดจากชุดข้อมูลทดสอบของโมเดล ${model.name} v${model.version} ที่ระบบใช้งานอยู่`
          : "ยังไม่มีโมเดลที่เปิดใช้งาน"}
      </p>
    </div>
  );
}
