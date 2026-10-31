"use client";

import { useState } from "react";
import Image from "next/image";
import { Clock, Sparkles } from "lucide-react";
import { MissingImage } from "@/components/ui/missing-image";
import { cn } from "@/lib/utils";
import { SEVERITY_LABELS, ACNE_COLORS, ACNE_LABELS } from "@/types/analyze";
import { HistoryItem } from "./history-gallery";

interface HistoryGridViewProps {
  items: HistoryItem[];
  isAdminView: boolean;
  onSelect: (index: number) => void;
}

const SEVERITY_DOT: Record<string, string> = {
  MILD: "bg-emerald-500",
  MODERATE: "bg-amber-500",
  SEVERE: "bg-red-500",
};

function formatDate(date: Date) {
  return `${new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })} น.`;
}

// รูปย่อ ถ้าโหลดไม่ได้ (ไฟล์หาย) แสดงภาพแทนพร้อมไอคอน
function HistoryThumb({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);

  if (broken) return <MissingImage />;

  return (
    <Image
      src={src}
      alt="รูปที่วิเคราะห์"
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      unoptimized
      onError={() => setBroken(true)}
      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
    />
  );
}

export function HistoryGridView({
  items,
  isAdminView,
  onSelect,
}: HistoryGridViewProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item, index) => {
        const imageUrl = item.imageUrl
          ? item.imageUrl
          : `/api/images/${item.imageName}`;
        const severityInfo =
          SEVERITY_LABELS[item.severity] ?? SEVERITY_LABELS.MILD;
        const found = Object.entries(item.counts ?? {})
          .filter(([, count]) => count > 0)
          .sort((a, b) => b[1] - a[1]);
        const userName = item.user?.name || item.user?.email?.split("@")[0];

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(index)}
            className="group bg-card hover:border-primary/40 focus-visible:ring-ring flex cursor-pointer flex-col overflow-hidden rounded-2xl border text-left shadow-sm transition-[box-shadow,border-color,transform] duration-300 outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2"
          >
            <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden">
              <HistoryThumb src={imageUrl} />
              <span className="bg-background/90 absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    SEVERITY_DOT[item.severity] ?? SEVERITY_DOT.MILD,
                  )}
                  aria-hidden="true"
                />
                {severityInfo?.label}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
              <p className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tabular-nums">
                  {item.total}
                </span>
                <span className="text-muted-foreground text-sm">จุดที่พบ</span>
              </p>

              {found.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {found.map(([type, count]) => (
                    <li
                      key={type}
                      className="bg-muted/60 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: ACNE_COLORS[type] ?? "#888" }}
                        aria-hidden="true"
                      />
                      {ACNE_LABELS[type] ?? type}
                      <span className="font-semibold tabular-nums">
                        {count}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  ไม่พบสิว
                </p>
              )}

              <div className="text-muted-foreground mt-auto flex flex-col gap-1.5 border-t pt-3 text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatDate(item.createdAt)}
                </span>
                {isAdminView && (userName || item.model) && (
                  <span className="flex items-center justify-between gap-2">
                    {userName && (
                      <span className="text-foreground/80 inline-flex min-w-0 items-center gap-1.5">
                        <span className="bg-primary/15 text-primary relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold">
                          {item.user?.image ? (
                            <Image
                              src={item.user.image}
                              alt=""
                              fill
                              sizes="20px"
                              className="object-cover"
                            />
                          ) : (
                            userName.charAt(0).toUpperCase()
                          )}
                        </span>
                        <span className="truncate">{userName}</span>
                      </span>
                    )}
                    {item.model && (
                      <span className="shrink-0 font-mono">
                        {item.model.name} v{item.model.version}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
