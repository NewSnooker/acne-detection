"use client";

import { useState, useMemo } from "react";
import { subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { PersonalStatsChart } from "./personal-stats-chart";
import { SeverityDonutChart } from "./severity-donut-chart";
import { AcneTypesChart } from "./acne-types-chart";
import { Calendar, RotateCcw } from "lucide-react";

type Preset = "todayHourly" | "7days" | "30days" | "thisMonth" | "thisYear" | "all" | "custom";

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

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as Preset;
    setPreset(val);
    if (val !== "custom") {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setPreset("all");
  };

  const filteredData = useMemo(() => {
    if (data.length === 0) return [];
    
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = endOfDay(now);

    if (preset === "todayHourly") {
      start = startOfDay(now);
    } else if (preset === "7days") {
      start = startOfDay(subDays(now, 7));
    } else if (preset === "30days") {
      start = startOfDay(subDays(now, 30));
    } else if (preset === "thisMonth") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (preset === "thisYear") {
      start = new Date(now.getFullYear(), 0, 1);
    } else if (preset === "custom") {
      if (startDate) start = startOfDay(parseISO(startDate));
      if (endDate) end = endOfDay(parseISO(endDate));
    }

    if (!start && !end) return data;

    return data.filter((item) => {
      const itemDate = new Date(item.createdAt);
      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;
      return true;
    });
  }, [data, preset, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Global Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={preset}
            onChange={handlePresetChange}
            className="h-10 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer min-w-[150px]"
          >
            <option value="all">ทั้งหมด (All Time)</option>
            <option value="todayHourly">วันนี้รายชั่วโมง (Today Hourly)</option>
            <option value="7days">7 วันล่าสุด (Last 7 Days)</option>
            <option value="30days">30 วันล่าสุด (Last 30 Days)</option>
            <option value="thisMonth">รายเดือนปีนี้ (Monthly)</option>
            <option value="thisYear">รายปี (Yearly)</option>
            <option value="custom">กำหนดเอง (Custom)...</option>
          </select>

          {preset === "custom" && (
            <div className="flex items-center gap-2 border rounded-lg px-2 py-1 bg-background h-10 shrink-0">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-sm px-1"
              />
              <span className="text-muted-foreground text-sm">ถึง</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-sm px-1"
              />
              <button 
                onClick={handleReset}
                className="p-1 hover:bg-muted rounded-full transition-colors"
                title="รีเซ็ตตัวกรอง"
              >
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
            </div>
          )}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Main Chart (Spans full width or 2 columns) */}
        <div className="lg:col-span-2 bg-card border rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              จำนวนสิวทั้งหมด <span className="text-muted-foreground text-sm font-normal">(Total Acne Count)</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">แสดงจำนวนสิวรวมที่พบจากการสแกนแต่ละครั้ง เพื่อดูแนวโน้มว่าการรักษาสิวมีประสิทธิภาพดีขึ้นหรือไม่</p>
          </div>
          <div className="flex-1 min-h-[400px]">
            <PersonalStatsChart data={filteredData} />
          </div>
        </div>

        {/* Severity Donut Chart */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              สัดส่วนระดับความรุนแรง <span className="text-muted-foreground text-sm font-normal">(Severity Overview)</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">สรุประดับความรุนแรงของสิวที่ระบบประเมินได้ในช่วงเวลาที่เลือก เพื่อให้เห็นภาพรวมของสภาพผิว</p>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[350px]">
            <SeverityDonutChart data={filteredData} />
          </div>
        </div>

        {/* Acne Types Pie Chart */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              สรุปประเภทสิวที่พบ <span className="text-muted-foreground text-sm font-normal">(Acne Types Breakdown)</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">แสดงสัดส่วนของสิวแต่ละชนิด (อักเสบ, อุดตัน, ซีสต์ ฯลฯ) รวมถึงสัดส่วนครั้งที่ไม่พบสิว (หน้าใส)</p>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[350px]">
            <AcneTypesChart data={filteredData} />
          </div>
        </div>

      </div>
    </div>
  );
}
