"use client";

import { useState, useMemo } from "react";
import {
  subDays,
  startOfDay,
  endOfDay,
  parseISO,
  format,
  startOfMonth,
} from "date-fns";
import { useSearchParams } from "next/navigation";
import { PersonalStatsChart } from "./personal-stats-chart";
import { SeverityDonutChart } from "./severity-donut-chart";
import { AcneTypesChart } from "./acne-types-chart";
import { GlobalFilter } from "./global-filter";
import { ScanFace, Sparkles, Activity } from "lucide-react";
import { SEVERITY_LABELS } from "@/types/analyze";

interface AnalysisData {
  createdAt: Date;
  total: number;
  severity: string;
  counts: any;
}

interface StatisticsDashboardProps {
  data: AnalysisData[];
}

export function StatisticsDashboard({ data }: StatisticsDashboardProps) {
  const searchParams = useSearchParams();
  const startStr = searchParams.get("start");
  const endStr = searchParams.get("end");
  const isAll = searchParams.get("all") === "true";

  const [activeTab, setActiveTab] = useState<"severity" | "types">("severity");

  const filteredData = useMemo(() => {
    if (data.length === 0) return [];

    let start: Date | null = null;
    let end: Date | null = null;

    if (startStr && endStr) {
      start = startOfDay(new Date(startStr));
      end = endOfDay(new Date(endStr));

      // If "Today" (single day) is selected, expand start date by 1 day to show a trend line from yesterday
      if (startStr === endStr) {
        start = subDays(start, 1);
      }
    } else if (!isAll) {
      const now = new Date();
      end = endOfDay(now);
      start = startOfMonth(now);
    }

    if (!start && !end) return data;

    return data.filter((item) => {
      const itemDate = new Date(item.createdAt);
      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;
      return true;
    });
  }, [data, startStr, endStr, isAll]);

  // Aggregate user data by day to create a continuous padded trend line, exactly like the Admin chart.
  const paddedDailyData = useMemo(() => {
    if (filteredData.length === 0 && (!startStr || !endStr)) return [];

    let start: Date | null = null;
    let end: Date | null = null;

    if (startStr && endStr) {
      start = startOfDay(new Date(startStr));
      end = endOfDay(new Date(endStr));
      if (startStr === endStr) {
        start = subDays(start, 1);
      }
    } else if (!isAll) {
      const now = new Date();
      end = endOfDay(now);
      start = startOfMonth(now);
    }

    if (!start || !end) return filteredData; // Fallback for All Time

    const dailyMap = new Map<string, number>();
    const curr = new Date(start);
    const maxDays = 365; // safety limit
    let days = 0;
    while (curr <= end && days < maxDays) {
      dailyMap.set(format(curr, "yyyy-MM-dd"), 0);
      curr.setDate(curr.getDate() + 1);
      days++;
    }

    const dayCounts = new Map<string, { sum: number; count: number }>();
    filteredData.forEach((item) => {
      const key = format(new Date(item.createdAt), "yyyy-MM-dd");
      if (dailyMap.has(key)) {
        if (!dayCounts.has(key)) dayCounts.set(key, { sum: 0, count: 0 });
        const stats = dayCounts.get(key)!;
        stats.sum += item.total;
        stats.count++;
      }
    });

    const result: AnalysisData[] = [];
    dailyMap.forEach((_, key) => {
      const stats = dayCounts.get(key);
      // Use average acne count if multiple scans in a day, or 0 if none
      const avg = stats ? Math.round(stats.sum / stats.count) : 0;
      result.push({
        createdAt: new Date(key), // timestamp for that day
        total: avg,
        severity: "",
        counts: {},
      });
    });

    return result;
  }, [filteredData, startStr, endStr, isAll]);

  // Calculate summary metrics based on filteredData
  const totalScans = filteredData.length;

  let totalAcne = 0;
  const severityCounts = { MILD: 0, MODERATE: 0, SEVERE: 0 };

  filteredData.forEach((item) => {
    totalAcne += item.total;
    if (
      item.severity &&
      severityCounts[item.severity as keyof typeof severityCounts] !== undefined
    ) {
      severityCounts[item.severity as keyof typeof severityCounts]++;
    }
  });

  const clearSkinCount = filteredData.filter((item) => item.total === 0).length;

  // Find most frequent severity
  let mostFrequentSeverity = "ไม่พบ";
  let maxCount = 0;
  let severityColor = "text-muted-foreground";

  if (totalScans > 0) {
    if (severityCounts.SEVERE > maxCount) {
      maxCount = severityCounts.SEVERE;
      mostFrequentSeverity = SEVERITY_LABELS.SEVERE.label;
      severityColor = SEVERITY_LABELS.SEVERE.color;
    }
    if (severityCounts.MODERATE > maxCount) {
      maxCount = severityCounts.MODERATE;
      mostFrequentSeverity = SEVERITY_LABELS.MODERATE.label;
      severityColor = SEVERITY_LABELS.MODERATE.color;
    }
    if (severityCounts.MILD > maxCount) {
      maxCount = severityCounts.MILD;
      mostFrequentSeverity = SEVERITY_LABELS.MILD.label;
      severityColor = SEVERITY_LABELS.MILD.color;
    }
    if (maxCount === 0) {
      mostFrequentSeverity = "ไม่พบ";
      severityColor = "text-emerald-500";
    }
  }

  // Generate date suffix for subtexts
  let dateSuffix = "ตลอดการใช้งาน";
  if (startStr && endStr) {
    const today = new Date();
    const s = new Date(startStr);
    const diffDays = Math.round(
      (today.getTime() - s.getTime()) / (1000 * 3600 * 24),
    );

    if (diffDays === 0) dateSuffix = "ของวันนี้";
    else if (diffDays <= 7 && diffDays > 0) dateSuffix = "ใน 7 วันล่าสุด";
    else dateSuffix = "ในช่วงเวลาที่เลือก";
  } else if (!isAll) {
    dateSuffix = "ในเดือนนี้"; // default
  }

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-center text-2xl font-bold tracking-tight sm:text-start">
            ภาพรวมของฉัน <br className="sm:hidden" />
            (My Overview)
          </h1>
          <p className="text-muted-foreground mt-1 text-center sm:text-start">
            แสดงภาพรวมผลการวิเคราะห์สิว สถิติการใช้งาน และข้อมูลสรุปของคุณ
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-end">
          <GlobalFilter />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-card relative flex flex-col justify-center overflow-hidden rounded-2xl border p-5 shadow-sm">
          <div className="absolute top-4 right-4 opacity-10">
            <ScanFace className="text-primary h-12 w-12" />
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-lg p-2">
              <ScanFace className="text-primary h-4 w-4" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              การสแกนทั้งหมด
            </p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{totalScans}</span>
            <span className="text-muted-foreground text-sm">ครั้ง</span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">{dateSuffix}</p>
        </div>

        <div className="bg-card relative flex flex-col justify-center overflow-hidden rounded-2xl border p-5 shadow-sm">
          <div className="absolute top-4 right-4 opacity-10">
            <Sparkles className="h-12 w-12 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <Sparkles className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              จำนวนครั้งที่หน้าใส
            </p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{clearSkinCount}</span>
            <span className="text-muted-foreground text-sm">ครั้ง</span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            สแกนแล้วไม่พบสิวเลย {dateSuffix}
          </p>
        </div>

        <div className="bg-card relative flex flex-col justify-center overflow-hidden rounded-2xl border p-5 shadow-sm">
          <div className="absolute top-4 right-4 opacity-10">
            <Activity className="text-primary h-12 w-12" />
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-lg p-2">
              <Activity className="text-primary h-4 w-4" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              ระดับความรุนแรงที่พบบ่อย
            </p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${severityColor}`}>
              {mostFrequentSeverity}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            จากประวัติสแกน {dateSuffix}
          </p>
        </div>
      </div>

      {/* Grid Layout Row 1 (3 columns total) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main Chart (Spans 2 columns) */}
        <div className="bg-card flex flex-col rounded-2xl border p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                จำนวนสิวทั้งหมด{" "}
                <span className="text-muted-foreground text-sm font-normal">
                  (Total Acne Count)
                </span>
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                แสดงจำนวนสิวรวมที่พบจากการสแกนแต่ละครั้ง {dateSuffix}
              </p>
            </div>
          </div>
          <div className="min-h-[350px] flex-1">
            <PersonalStatsChart data={paddedDailyData} />
          </div>
        </div>

        {/* Combined Severity & Types Chart (Spans 1 column) */}
        <div className="bg-card flex flex-col rounded-2xl border p-6 shadow-sm lg:col-span-1">
          <div className="mb-4 flex flex-col gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                ภาพรวมและประเภทสิว
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                สัดส่วนระดับความรุนแรงและประเภทสิวที่พบ {dateSuffix}
              </p>
            </div>

            {/* Custom Tabs */}
            <div className="bg-muted flex rounded-lg p-1">
              <button
                className={`flex-1 cursor-pointer rounded-md py-1.5 text-sm transition-all ${
                  activeTab === "severity"
                    ? "bg-background text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("severity")}
              >
                ระดับความรุนแรง
              </button>
              <button
                className={`flex-1 cursor-pointer rounded-md py-1.5 text-sm transition-all ${
                  activeTab === "types"
                    ? "bg-background text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("types")}
              >
                ประเภทสิว
              </button>
            </div>
          </div>
          <div className="flex min-h-[350px] flex-1 items-center justify-center">
            {activeTab === "severity" ? (
              <SeverityDonutChart data={filteredData} />
            ) : (
              <AcneTypesChart data={filteredData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
