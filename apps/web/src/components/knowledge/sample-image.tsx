import Image from "next/image";
import { ACNE_COLORS, ACNE_LABELS } from "@/types/analyze";
import { cn } from "@/lib/utils";
import type { SampleBox } from "./acne-samples";
import type { PrivacyBar } from "@/config/site";

// ภาพตัวอย่างจากชุดข้อมูล พร้อมกรอบสีตามชนิดสิว (สีเดียวกับหน้าผลวิเคราะห์)
export function SampleImage({
  src,
  boxes,
  alt,
  showLabels = false,
  priority = false,
  privacyBar,
  className,
}: {
  src: string;
  boxes: SampleBox[];
  alt: string;
  showLabels?: boolean;
  priority?: boolean;
  // แถบดำปิดตาเพื่อปกปิดตัวตนของเจ้าของภาพ
  privacyBar?: PrivacyBar;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted relative aspect-square overflow-hidden",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 40vw, 100vw"
        className="object-cover"
      />
      {privacyBar && (
        <div
          aria-hidden="true"
          className="absolute rounded-sm bg-black"
          style={{
            left: `${privacyBar.x}%`,
            top: `${privacyBar.y}%`,
            width: `${privacyBar.w}%`,
            height: `${privacyBar.h}%`,
            transform: `rotate(${privacyBar.rotate ?? 0}deg)`,
          }}
        />
      )}
      {boxes.map((b, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute rounded-[3px] border-2"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: `${b.w}%`,
            height: `${b.h}%`,
            borderColor: ACNE_COLORS[b.cls],
          }}
        >
          {showLabels && (
            <span
              className={cn(
                "absolute -top-5 left-[-2px] rounded-sm px-1 text-[10px] leading-4 font-medium whitespace-nowrap",
                // สีอ่อนต้องใช้ตัวอักษรเข้มจึงจะอ่านออก
                b.cls === "whitehead" || b.cls === "pustule"
                  ? "text-slate-900"
                  : "text-white",
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
