"use client";

import { useState, useMemo } from "react";
import { subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { PersonalStatsChart } from "./personal-stats-chart";
import { SeverityDonutChart } from "./severity-donut-chart";
import { AcneTypesChart } from "./acne-types-chart";
import { Calendar, RotateCcw } from "lucide-react";

type Preset =
  | "todayHourly"
  | "7days"
  | "30days"
  | "thisMonth"
  | "thisYear"
  | "all";

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
  const [preset, setPreset] = useState<Preset>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Toggle for custom date picker
  const [isCustomMode, setIsCustomMode] = useState(false);

  const [activeTab, setActiveTab] = useState<"severity" | "types">("severity");

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as Preset;
    setPreset(val);
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setPreset("all");
    setIsCustomMode(false);
  };

  const filteredData = useMemo(() => {
    if (data.length === 0) return [];

    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = endOfDay(now);

    if (isCustomMode) {
      if (startDate) start = startOfDay(parseISO(startDate));
      if (endDate) end = endOfDay(parseISO(endDate));
    } else if (preset === "todayHourly") {
      start = startOfDay(now);
    } else if (preset === "7days") {
      start = startOfDay(subDays(now, 7));
    } else if (preset === "30days") {
      start = startOfDay(subDays(now, 30));
    } else if (preset === "thisMonth") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (preset === "thisYear") {
      start = new Date(now.getFullYear(), 0, 1);
    }

    if (!start && !end) return data;

    return data.filter((item) => {
      const itemDate = new Date(item.createdAt);
      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;
      return true;
    });
  }, [data, preset, startDate, endDate, isCustomMode]);

  // Calculate ALL-TIME summary metrics based on raw `data` (unaffected by filters)
  const totalScans = data.length;
  
  let totalAcne = 0;
  const severityCounts = { MILD: 0, MODERATE: 0, SEVERE: 0 };
  
  data.forEach(item => {
    totalAcne += item.total;
    if (item.severity && severityCounts[item.severity as keyof typeof severityCounts] !== undefined) {
      severityCounts[item.severity as keyof typeof severityCounts]++;
    }
  });

  const clearSkinCount = data.filter(item => item.total === 0).length;
  
  // Find most frequent severity
  let mostFrequentSeverity = "ไม่มีข้อมูล";
  let maxCount = 0;
  if (totalScans > 0) {
    if (severityCounts.SEVERE > maxCount) { maxCount = severityCounts.SEVERE; mostFrequentSeverity = "รุนแรง"; }
    if (severityCounts.MODERATE > maxCount) { maxCount = severityCounts.MODERATE; mostFrequentSeverity = "ปานกลาง"; }
    if (severityCounts.MILD > maxCount) { maxCount = severityCounts.MILD; mostFrequentSeverity = "เล็กน้อย"; }
    if (maxCount === 0 && totalAcne === 0) mostFrequentSeverity = "หน้าใส";
  }

  return (
    <div className="space-y-6">
      
      {/* Summary Cards (Always All-Time) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <p className="text-sm text-muted-foreground font-medium">การสแกนทั้งหมด</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{totalScans}</span>
            <span className="text-sm text-muted-foreground">ครั้ง</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">ตลอดการใช้งาน</p>
        </div>
        
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <p className="text-sm text-muted-foreground font-medium">จำนวนครั้งที่หน้าใส</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{clearSkinCount}</span>
            <span className="text-sm text-muted-foreground">ครั้ง</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">สแกนแล้วไม่พบสิวเลย</p>
        </div>

        <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <p className="text-sm text-muted-foreground font-medium">ระดับความรุนแรงที่พบบ่อย</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">{mostFrequentSeverity}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">จากประวัติสแกนทั้งหมด</p>
        </div>
      </div>

      {/* Grid Layout Row 1 (3 columns total) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart (Spans 2 columns) */}
        <div className="lg:col-span-2 bg-card border rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                จำนวนสิวทั้งหมด{" "}
                <span className="text-muted-foreground text-sm font-normal">
                  (Total Acne Count)
                </span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                แสดงจำนวนสิวรวมที่พบจากการสแกนแต่ละครั้ง
              </p>
            </div>

            {/* Filter Toolbar embedded in the first chart */}
            <div className="flex flex-wrap items-center gap-2">
              {!isCustomMode ? (
                <>
                  <div className="w-full flex gap-2">
                    <select
                      value={preset}
                      onChange={handlePresetChange}
                      className="h-9 px-3 py-1 w-full rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer min-w-[150px]"
                    >
                      <option value="all">ทั้งหมด (All Time)</option>
                      <option value="todayHourly">
                        วันนี้รายชั่วโมง (Today Hourly)
                      </option>
                      <option value="7days">7 วันล่าสุด (Last 7 Days)</option>
                      <option value="30days">
                        30 วันล่าสุด (Last 30 Days)
                      </option>
                      <option value="thisMonth">รายเดือนปีนี้ (Monthly)</option>
                      <option value="thisYear">รายปี (Yearly)</option>
                    </select>
                    <button
                      onClick={() => setIsCustomMode(true)}
                      className="h-9 w-9 flex items-center justify-center rounded-lg border bg-background hover:bg-muted transition-colors"
                      title="ระบุช่วงเวลาเอง"
                    >
                      <Calendar className="h-3.5 w-3.5 cursor-pointer text-muted-foreground" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="flex flex-1 sm:flex-initial items-center justify-between gap-2 border rounded-lg p-2 bg-background h-9">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent border-none focus:outline-none text-xs px-1 w-full sm:w-[110px]"
                    />
                    <span className="text-muted-foreground text-xs font-medium">
                      ถึง
                    </span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent border-none focus:outline-none text-xs px-1 w-full sm:w-[110px]"
                    />
                  </div>
                  <div className="flex items-center border rounded-lg px-1 py-1 bg-background h-9 shrink-0">
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
                        setIsCustomMode(false);
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
          </div>
          <div className="flex-1 min-h-[350px]">
            <PersonalStatsChart data={filteredData} />
          </div>
        </div>

        {/* Combined Severity & Types Chart (Spans 1 column) */}
        <div className="lg:col-span-1 bg-card border rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-4 flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                ภาพรวมและประเภทสิว
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                สัดส่วนระดับความรุนแรงและประเภทสิวที่พบ
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
