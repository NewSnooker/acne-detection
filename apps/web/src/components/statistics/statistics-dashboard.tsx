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
    let curr = new Date(start);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-center sm:text-start text-2xl font-bold tracking-tight ">
            ภาพรวมของฉัน <br className="sm:hidden" />
            (My Overview)
          </h1>
          <p className="text-center sm:text-start text-muted-foreground mt-1">
            แสดงภาพรวมผลการวิเคราะห์สิว สถิติการใช้งาน และข้อมูลสรุปของคุณ
          </p>
        </div>

        <div className="flex flex-wrap w-full sm:w-auto items-center justify-center sm:justify-end gap-2">
          <GlobalFilter />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-4 top-4 opacity-10">
            <ScanFace className="w-12 h-12 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ScanFace className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              การสแกนทั้งหมด
            </p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{totalScans}</span>
            <span className="text-sm text-muted-foreground">ครั้ง</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{dateSuffix}</p>
        </div>

        <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-4 top-4 opacity-10">
            <Sparkles className="w-12 h-12 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              จำนวนครั้งที่หน้าใส
            </p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{clearSkinCount}</span>
            <span className="text-sm text-muted-foreground">ครั้ง</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            สแกนแล้วไม่พบสิวเลย {dateSuffix}
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-4 top-4 opacity-10">
            <Activity className="w-12 h-12 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              ระดับความรุนแรงที่พบบ่อย
            </p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${severityColor}`}>
              {mostFrequentSeverity}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            จากประวัติสแกน {dateSuffix}
          </p>
        </div>
      </div>

      {/* Grid Layout Row 1 (3 columns total) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Chart (Spans 2 columns) */}
        <div className="lg:col-span-2 bg-card border rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                จำนวนสิวทั้งหมด{" "}
                <span className="text-muted-foreground text-sm font-normal">
                  (Total Acne Count)
                </span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                แสดงจำนวนสิวรวมที่พบจากการสแกนแต่ละครั้ง {dateSuffix}
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-[350px]">
            <PersonalStatsChart data={paddedDailyData} />
          </div>
        </div>

        {/* Combined Severity & Types Chart (Spans 1 column) */}
        <div className="lg:col-span-1 bg-card border rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-4 flex flex-col gap-3">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                ภาพรวมและประเภทสิว
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                สัดส่วนระดับความรุนแรงและประเภทสิวที่พบ {dateSuffix}
              </p>
            </div>

            {/* Custom Tabs */}
            <div className="flex bg-muted p-1 rounded-lg">
              <button
                className={`flex-1 cursor-pointer text-sm py-1.5 rounded-md transition-all ${
                  activeTab === "severity"
                    ? "bg-background shadow-sm font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("severity")}
              >
                ระดับความรุนแรง
              </button>
              <button
                className={`flex-1 cursor-pointer text-sm py-1.5 rounded-md transition-all ${
                  activeTab === "types"
                    ? "bg-background shadow-sm font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("types")}
              >
                ประเภทสิว
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[350px]">
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
