"use client";

import { useState, useMemo } from "react";
import { subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { Calendar } from "lucide-react";

type Preset = "7days" | "30days" | "thisMonth" | "all" | "custom";

interface AnalysisData {
  createdAt: Date;
  total: number;
  severity: string;
  counts: any;
}

interface ChartCardProps {
  title: string;
  description?: string;
  data: AnalysisData[];
  children: (filteredData: AnalysisData[]) => React.ReactNode;
}

export function ChartCard({ title, description, data, children }: ChartCardProps) {
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

  const filteredData = useMemo(() => {
    if (data.length === 0) return [];
    
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = endOfDay(now);

    if (preset === "7days") {
      start = startOfDay(subDays(now, 7));
    } else if (preset === "30days") {
      start = startOfDay(subDays(now, 30));
    } else if (preset === "thisMonth") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
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
    <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        {/* Local Filter for this specific chart */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={preset}
            onChange={handlePresetChange}
            className="h-9 px-3 py-1 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="all">ทั้งหมด</option>
            <option value="7days">7 วันล่าสุด</option>
            <option value="30days">30 วันล่าสุด</option>
            <option value="thisMonth">เดือนนี้</option>
            <option value="custom">กำหนดเอง...</option>
          </select>

          {preset === "custom" && (
            <div className="flex items-center gap-2 border rounded-lg px-2 py-1 bg-background h-9">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-xs px-1 py-1"
              />
              <span className="text-muted-foreground text-xs">ถึง</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-xs px-1 py-1"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative z-0">
        {children(filteredData)}
      </div>
    </div>
  );
}
