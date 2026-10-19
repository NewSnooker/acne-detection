import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ข้อจำกัดของระบบตามขอบเขตโครงงานข้อ 1.4.1: ระบบไม่ทดแทนการวินิจฉัยของแพทย์
export const MEDICAL_DISCLAIMER =
  "ผลการวิเคราะห์นี้เป็นการประเมินเบื้องต้นด้วย AI เท่านั้น ไม่สามารถใช้ทดแทนการวินิจฉัยหรือการรักษาของแพทย์ได้ หากมีอาการรุนแรงหรือมีข้อสงสัย ควรปรึกษาแพทย์ผิวหนัง";

export function MedicalDisclaimer({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
        className,
      )}
    >
      <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-300" />
      <p>
        <span className="font-semibold">ข้อควรทราบ: </span>
        {MEDICAL_DISCLAIMER}
      </p>
    </div>
  );
}
