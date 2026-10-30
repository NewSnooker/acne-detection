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
    currentStart && currentEnd
      ? presetFromRange(currentStart, currentEnd)
      : "all";

  // state ที่ผู้ใช้กำลังแก้ จะถูกล้างเมื่อ URL เปลี่ยน (ผ่าน key ใน GlobalFilterRoute)
  const [customModeOverride, setCustomModeOverride] = useState<boolean | null>(
    null,
  );
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
    <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-end">
      {!isCustomMode ? (
        <div className="flex w-full gap-2">
          <select
            value={preset}
            onChange={handlePresetChange}
            className="bg-card focus:ring-primary/50 h-9 w-full min-w-[150px] cursor-pointer rounded-lg border px-3 py-1 text-sm shadow focus:ring-2 focus:outline-none"
          >
            <option value="all">ทั้งหมด (All Time)</option>
            <option value="todayHourly">วันนี้ (Today)</option>
            <option value="7days">7 วันล่าสุด (Last 7 Days)</option>
            <option value="thisMonth">รายเดือน (Monthly)</option>
            <option value="thisYear">รายปี (Yearly)</option>
          </select>
          <button
            onClick={() => setCustomModeOverride(true)}
            className="bg-card hover:bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow transition-colors"
            title="ระบุช่วงเวลาเอง"
          >
            <Calendar className="text-muted-foreground h-3.5 w-3.5 cursor-pointer" />
          </button>
        </div>
      ) : (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="bg-card flex h-9 flex-1 items-center justify-between gap-2 rounded-lg border p-2 shadow sm:flex-initial">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value && endDate) {
                  updateUrlParams(e.target.value, endDate);
                }
              }}
              className="w-full border-none bg-transparent px-1 text-xs focus:outline-none sm:w-[110px]"
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
              className="w-full border-none bg-transparent px-1 text-xs focus:outline-none sm:w-[110px]"
            />
          </div>
          <div className="bg-card flex h-9 shrink-0 items-center rounded-lg border px-1 py-1 shadow">
            <button
              onClick={handleReset}
              className="hover:bg-muted cursor-pointer rounded-md p-1 transition-colors"
              title="รีเซ็ต"
            >
              <RotateCcw className="text-muted-foreground h-3.5 w-3.5" />
            </button>
            <div className="bg-border mx-1 h-4 w-px" />
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setCustomModeOverride(false);
              }}
              className="hover:bg-muted cursor-pointer rounded-md p-1 transition-colors"
              title="สลับกลับไปใช้ตัวเลือกด่วน"
            >
              <Calendar className="text-primary h-3.5 w-3.5 cursor-pointer" />
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
        <div className="bg-muted h-9 w-full animate-pulse rounded-md sm:w-40" />
      }
    >
      <GlobalFilterRoute />
    </Suspense>
  );
}
