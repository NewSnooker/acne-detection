import { ModelMetrics } from "@/components/knowledge/model-metrics";
import { SeverityLevels } from "@/components/knowledge/severity-levels";
import { PageIntro, StartCta } from "@/components/public/page-intro";
import { getActiveModelMetrics } from "@/server/active-model";

export const metadata = {
  title: "ความแม่นยำและเกณฑ์ประเมิน",
  description:
    "ค่าความแม่นยำของโมเดล YOLO ที่ใช้งานอยู่ และเกณฑ์ประเมินความรุนแรงของสิว 3 ระดับ",
};

export default async function AccuracyPage() {
  const activeModel = await getActiveModelMetrics();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-12 md:py-16">
      <PageIntro
        eyebrow="ประสิทธิภาพโมเดล"
        title="ความแม่นยำของ AI"
        desc="โมเดล YOLO ที่ฝึกด้วยภาพสิว 6 ชนิด วัดผลด้วยตัวชี้วัดมาตรฐานของงานตรวจจับวัตถุ"
      />
      <ModelMetrics model={activeModel} />

      <section className="flex flex-col gap-6">
        <div id="severity" className="flex scroll-mt-20 flex-col gap-2">
          <h2 className="text-2xl md:text-3xl">
            เกณฑ์ประเมินความรุนแรง 3 ระดับ
          </h2>
          <p className="text-muted-foreground">
            ดูจากชนิดและจำนวนสิวที่ตรวจพบ แล้วให้คำแนะนำตามระดับ
          </p>
        </div>
        <SeverityLevels showAdvice />
      </section>

      <StartCta />
    </div>
  );
}
