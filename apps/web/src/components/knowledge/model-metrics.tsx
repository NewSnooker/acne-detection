import { MODEL_METRICS, type ModelMetricKey } from "@/types/analyze";

export type ActiveModelMetrics = { name: string; version: string } & Record<ModelMetricKey, number | null>;

// ค่าประเมินของโมเดลที่ใช้งานอยู่ (ข้อ 1.3.3.3) — แอดมินกรอกในหน้าจัดการโมเดล
export function ModelMetrics({ model }: { model: ActiveModelMetrics | null }) {
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {MODEL_METRICS.map(({ key, label, desc }) => {
          const value = model?.[key];
          return (
            <div key={key} className="flex flex-col gap-2 rounded-3xl border bg-card p-6">
              <dt className="text-sm font-medium">{label}</dt>
              <dd className="order-first text-4xl font-semibold tracking-tight tabular-nums">
                {value != null ? (
                  <>
                    {value.toFixed(1)}
                    <span className="text-xl text-muted-foreground">%</span>
                  </>
                ) : (
                  <span className="text-base font-normal text-muted-foreground">รอบันทึกผล</span>
                )}
              </dd>
              <dd className="text-xs leading-relaxed text-muted-foreground">{desc}</dd>
            </div>
          );
        })}
      </dl>
      <p className="text-sm text-muted-foreground">
        {model ? `วัดจากชุดข้อมูลทดสอบ · โมเดล ${model.name} v${model.version}` : "ยังไม่มีโมเดลที่เปิดใช้งาน"}
      </p>
    </div>
  );
}
