import { requireUserPage } from "@/lib/auth/guards";
import { ImageAnalyzer } from "@/components/analyze/image-analyzer";
import { MedicalDisclaimer } from "@/components/analyze/medical-disclaimer";
import { HolisticCare } from "@/components/knowledge/holistic-care";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "วิเคราะห์สิวด้วย AI (AI Acne Analysis)",
};

export default async function AnalyzePage() {
  await requireUserPage();

  const activeModelCount = await prisma.aiModel.count({
    where: { isActive: true },
  });
  const isModelAvailable = activeModelCount > 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex shrink-0 flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-center text-2xl font-bold tracking-tight sm:text-start">
            วิเคราะห์สิวด้วย AI <br className="sm:hidden" />
            (AI Acne Analysis)
          </h1>
          <p className="text-muted-foreground text-center sm:text-start">
            อัปโหลดภาพถ่ายใบหน้าเพื่อวิเคราะห์สิวด้วย AI
            และแสดงผลลัพธ์การตรวจจับ
          </p>
        </div>
      </div>

      {/* ข้อ 1.3.3.4: คำแนะนำองค์รวมก่อนเข้าสู่การประมวลผลภาพ */}
      <HolisticCare compact />

      <MedicalDisclaimer />

      <div className="flex-1 overflow-y-auto pb-8">
        <ImageAnalyzer isModelAvailable={isModelAvailable} />
      </div>
    </div>
  );
}
