import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

// ภาพแทนเมื่อโหลดรูปไม่ได้ (ไฟล์ถูกลบหรือย้ายที่เก็บ)
export function MissingImage({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-2",
        className,
      )}
      role="img"
      aria-label="ไม่พบไฟล์รูป"
    >
      <ImageOff
        className={compact ? "h-4 w-4" : "h-10 w-10"}
        aria-hidden="true"
      />
      {!compact && <span className="text-sm">ไม่พบไฟล์รูป</span>}
    </div>
  );
}
