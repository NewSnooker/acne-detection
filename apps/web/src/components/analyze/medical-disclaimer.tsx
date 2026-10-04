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
        "flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-800 dark:text-amber-200",
        className,
      )}
    >
      <Info className="h-4 w-4 shrink-0 mt-0.5" />
      <p>
        <span className="font-semibold">ข้อควรทราบ: </span>
        {MEDICAL_DISCLAIMER}
      </p>
    </div>
  );
}
