import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ImageAnalyzer } from "@/components/analyze/image-analyzer";

import { hasActiveModel } from "@/app/actions/model-actions";

export const metadata = {
  title: "วิเคราะห์สิว - AcneAI",
};

export default async function AnalyzePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const isModelAvailable = await hasActiveModel();

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-4 h-[calc(100vh-6rem)]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-center sm:text-start text-2xl font-bold tracking-tight">
            วิเคราะห์สิวด้วย AI
          </h1>
          <p className="text-center sm:text-start text-muted-foreground">
            อัปโหลดรูปภาพใบหน้าของคุณเพื่อรับการวิเคราะห์ปัญหาสิวอย่างแม่นยำ
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <ImageAnalyzer isModelAvailable={isModelAvailable} />
      </div>
    </div>
  );
}
