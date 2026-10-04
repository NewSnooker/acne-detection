import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ImageAnalyzer } from "@/components/analyze/image-analyzer";
import { MedicalDisclaimer } from "@/components/analyze/medical-disclaimer";

import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "วิเคราะห์สิวด้วย AI (AI Acne Analysis)",
};

export default async function AnalyzePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const activeModelCount = await prisma.aiModel.count({
    where: { isActive: true },
  });
  const isModelAvailable = activeModelCount > 0;

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-center sm:text-start text-2xl font-bold tracking-tight">
            วิเคราะห์สิวด้วย AI <br className="sm:hidden" />(AI Acne Analysis)
          </h1>
          <p className="text-center sm:text-start text-muted-foreground">
            อัปโหลดภาพถ่ายใบหน้าเพื่อวิเคราะห์สิวด้วย AI
            และแสดงผลลัพธ์การตรวจจับ
          </p>
        </div>
      </div>

      <MedicalDisclaimer />

      <div className="flex-1 overflow-y-auto pb-8">
        <ImageAnalyzer isModelAvailable={isModelAvailable} />
      </div>
    </div>
  );
}
