import { ClipboardList, Lightbulb, ScanSearch, Upload } from "lucide-react";
import { requireUserPage } from "@/lib/auth/guards";
import { ImageAnalyzer } from "@/components/analyze/image-analyzer";
import { MedicalDisclaimer } from "@/components/analyze/medical-disclaimer";
import { HolisticCarePromo } from "@/components/knowledge/holistic-care-promo";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "วิเคราะห์สิวด้วย AI (AI Acne Analysis)",
};

const STEPS = [
  { icon: Upload, label: "อัปโหลดรูปใบหน้า" },
  { icon: ScanSearch, label: "กดวิเคราะห์ด้วย AI" },
  { icon: ClipboardList, label: "ดูผลและคำแนะนำ" },
];

export default async function AnalyzePage() {
  await requireUserPage();

  const activeModelCount = await prisma.aiModel.count({
    where: { isActive: true },
  });
  const isModelAvailable = activeModelCount > 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-8">
      <section className="from-primary/10 via-card to-card relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 sm:p-8">
        <div
          aria-hidden="true"
          className="bg-primary/10 pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full blur-3xl"
        />
        <div className="relative flex flex-col gap-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex max-w-2xl flex-col gap-2">
              <span className="text-primary text-sm font-semibold">
                AI Acne Analysis
              </span>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                วิเคราะห์สิวด้วย AI
              </h1>
              <p className="text-muted-foreground">
                อัปโหลดภาพถ่ายใบหน้า ระบบจะตรวจหาสิว 6 ชนิด บอกระดับความรุนแรง
                พร้อมคำแนะนำการดูแลผิว
              </p>
            </div>

            {/* ข้อ 1.3.3.4: คำแนะนำองค์รวมก่อนเข้าสู่การประมวลผลภาพ */}
            <HolisticCarePromo
              trigger={
                <button
                  type="button"
                  className="text-primary bg-background/70 hover:bg-primary/10 inline-flex shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-full border px-4 py-2 text-sm font-medium backdrop-blur transition-colors"
                >
                  <Lightbulb className="h-4 w-4" aria-hidden="true" />
                  คำแนะนำก่อนเริ่ม
                </button>
              }
            />
          </div>

          <ol className="grid gap-3 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li
                key={step.label}
                className="bg-background/70 relative flex items-center gap-3 rounded-2xl border p-3 backdrop-blur"
              >
                <span className="bg-primary text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold">
                  {i + 1}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2 font-medium">
                  <step.icon
                    className="text-muted-foreground h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  {step.label}
                </span>
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="bg-border absolute top-1/2 -right-3 hidden h-px w-3 sm:block"
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ImageAnalyzer isModelAvailable={isModelAvailable} />

      <MedicalDisclaimer />
    </div>
  );
}
