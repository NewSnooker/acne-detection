import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

// กล่องว่างแบบเดียวกันทุกหน้า (ไม่มีเส้นขอบ) — ใช้ตอนยังไม่มีข้อมูลหรือกรองแล้วไม่พบ
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  className,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  /** ปุ่มหรือลิงก์ให้ผู้ใช้ไปต่อ */
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-4 py-12 text-center",
        className,
      )}
    >
      <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="text-foreground font-semibold">{title}</p>
      {description && (
        <p className="text-muted-foreground max-w-md text-sm">{description}</p>
      )}
      {children && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
