import Image from "next/image";
import { ACNE_COLORS, ACNE_LABELS } from "@/types/analyze";
import { cn } from "@/lib/utils";
import type { SampleBox } from "./acne-samples";

// ภาพตัวอย่างจากชุดข้อมูล พร้อมกรอบสีตามชนิดสิว (สีเดียวกับหน้าผลวิเคราะห์)
export function SampleImage({
  src,
  boxes,
  alt,
  showLabels = false,
  priority = false,
  className,
}: {
  src: string;
  boxes: SampleBox[];
  alt: string;
  showLabels?: boolean;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-square overflow-hidden bg-muted", className)}>
      <Image src={src} alt={alt} fill priority={priority} sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
      {boxes.map((b, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute rounded-[3px] border-2"
          style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%`, borderColor: ACNE_COLORS[b.cls] }}
        >
          {showLabels && (
            <span
              className={cn(
                "absolute -top-5 left-[-2px] whitespace-nowrap rounded-sm px-1 text-[10px] font-medium leading-4",
                // สีอ่อนต้องใช้ตัวอักษรเข้มจึงจะอ่านออก
                b.cls === "whitehead" || b.cls === "pustule" ? "text-slate-900" : "text-white",
              )}
              style={{ backgroundColor: ACNE_COLORS[b.cls] }}
            >
              {ACNE_LABELS[b.cls]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
