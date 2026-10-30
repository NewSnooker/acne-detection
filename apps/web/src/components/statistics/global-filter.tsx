"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format, subDays, startOfMonth, startOfYear } from "date-fns";
import { Suspense, useState } from "react";
import { Calendar, RotateCcw } from "lucide-react";

type Preset = "todayHourly" | "7days" | "thisMonth" | "thisYear" | "all";

function presetFromRange(start: string, end: string): Preset | "custom" {
  const today = new Date();
  const startDate = new Date(start);
  const diffDays = Math.round(
    (today.getTime() - startDate.getTime()) / (1000 * 3600 * 24),
  );

  if (diffDays === 0) return "todayHourly";
  if (diffDays <= 7 && diffDays > 0) return "7days";
  if (startDate.getTime() === startOfMonth(today).getTime()) return "thisMonth";
  if (startDate.getTime() === startOfYear(today).getTime()) return "thisYear";
  return "custom";
}

function GlobalFilterInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStart = searchParams.get("start");
  const currentEnd = searchParams.get("end");
  const urlPreset =
    currentStart && currentEnd ? presetFromRange(currentStart, currentEnd) : "all";

  // state ที่ผู้ใช้กำลังแก้ จะถูกล้างเมื่อ URL เปลี่ยน (ผ่าน key ใน GlobalFilterRoute)
  const [customModeOverride, setCustomModeOverride] = useState<boolean | null>(null);
  const [startDate, setStartDate] = useState(currentStart || "");
  const [endDate, setEndDate] = useState(currentEnd || "");

  const isCustomMode = customModeOverride ?? urlPreset === "custom";
  const preset: Preset = urlPreset === "custom" ? "all" : urlPreset;

  const updateUrlParams = (start?: string, end?: string, isAll?: boolean) => {
    const params = new URLSearchParams(searchParams.toString());

    if (isAll) {
      params.delete("start");
      params.delete("end");
      params.set("all", "true");
    } else if (start && end) {
      params.set("start", start);
      params.set("end", end);
      params.delete("all");
    } else {
      params.delete("start");
      params.delete("end");
      params.delete("all");
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as Preset;
    setCustomModeOverride(false);

    const today = new Date();

    if (val === "all") {
      updateUrlParams(undefined, undefined, true);
    } else if (val === "todayHourly") {
      updateUrlParams(format(today, "yyyy-MM-dd"), format(today, "yyyy-MM-dd"));
    } else if (val === "7days") {
      updateUrlParams(
        format(subDays(today, 7), "yyyy-MM-dd"),
        format(today, "yyyy-MM-dd"),
      );
    } else if (val === "thisMonth") {
      updateUrlParams(
        format(startOfMonth(today), "yyyy-MM-dd"),
        format(today, "yyyy-MM-dd"),
      );
    } else if (val === "thisYear") {
      updateUrlParams(
        format(startOfYear(today), "yyyy-MM-dd"),
        format(today, "yyyy-MM-dd"),
      );
    }
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setCustomModeOverride(false);
    updateUrlParams(undefined, undefined, true);
  };

  return (
    <div className="flex flex-wrap w-full sm:w-auto items-center justify-center sm:justify-end gap-2">
      {!isCustomMode ? (
        <div className="flex gap-2 w-full ">
          <select
            value={preset}
            onChange={handlePresetChange}
            className="h-9 px-3 py-1 w-full rounded-lg border bg-card shadow text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer min-w-[150px]"
          >
            <option value="all">ทั้งหมด (All Time)</option>
            <option value="todayHourly">วันนี้ (Today)</option>
            <option value="7days">7 วันล่าสุด (Last 7 Days)</option>
            <option value="thisMonth">รายเดือน (Monthly)</option>
            <option value="thisYear">รายปี (Yearly)</option>
          </select>
          <button
            onClick={() => setCustomModeOverride(true)}
            className="h-9 w-9 flex items-center justify-center rounded-lg border bg-card shadow hover:bg-muted transition-colors shrink-0"
            title="ระบุช่วงเวลาเอง"
          >
            <Calendar className="h-3.5 w-3.5 cursor-pointer text-muted-foreground" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex flex-1 sm:flex-initial bg-card shadow items-center justify-between gap-2 border rounded-lg p-2 h-9">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value && endDate) {
                  updateUrlParams(e.target.value, endDate);
                }
              }}
              className="bg-transparent border-none focus:outline-none text-xs px-1 w-full sm:w-[110px]"
            />
            <span className="text-muted-foreground text-xs font-medium">
              ถึง
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (startDate && e.target.value) {
                  updateUrlParams(startDate, e.target.value);
                }
              }}
              className="bg-transparent border-none focus:outline-none text-xs px-1 w-full sm:w-[110px]"
            />
          </div>
          <div className="flex items-center bg-card shadow border rounded-lg px-1 py-1 h-9 shrink-0">
            <button
              onClick={handleReset}
              className="p-1 cursor-pointer hover:bg-muted rounded-md transition-colors"
              title="รีเซ็ต"
            >
              <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setCustomModeOverride(false);
              }}
              className="p-1 cursor-pointer hover:bg-muted rounded-md transition-colors"
              title="สลับกลับไปใช้ตัวเลือกด่วน"
            >
              <Calendar className="h-3.5 w-3.5 cursor-pointer text-primary" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GlobalFilterRoute() {
  const searchParams = useSearchParams();
  const rangeKey = `${searchParams.get("start")}|${searchParams.get("end")}`;
  return <GlobalFilterInner key={rangeKey} />;
}

export function GlobalFilter() {
  return (
    <Suspense
      fallback={
        <div className="h-9 w-full sm:w-40 bg-muted animate-pulse rounded-md" />
      }
    >
      <GlobalFilterRoute />
    </Suspense>
  );
}
