"use client";

import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import { ACNE_COLORS, ACNE_LABELS } from "@/types/analyze";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface AcneTypesChartProps {
  data: {
    counts: any; // Record<string, number>
    total: number;
  }[];
}

export function AcneTypesChart({ data }: AcneTypesChartProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full flex items-center justify-center min-h-[350px] relative z-0 mt-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse text-sm">กำลังโหลดข้อมูลกราฟ...</p>
        </div>
      </div>
    );
  }

  const types = ["papule", "pustule", "nodule", "cyst", "blackhead", "whitehead"];
  
  // Aggregate counts over the selected period
  const aggregatedCounts: Record<string, number> = {};
  types.forEach(t => aggregatedCounts[t] = 0);
  let clearSkinCount = 0;

  data.forEach((item) => {
    if (item.total === 0) {
      clearSkinCount++;
    } else {
      types.forEach(type => {
        if (item.counts?.[type]) {
          aggregatedCounts[type] += item.counts[type];
        }
      });
    }
  });

  // Filter out types with 0 counts to keep the pie chart clean
  const activeTypes = types.filter(t => aggregatedCounts[t] > 0);
  
  const series = activeTypes.map(t => aggregatedCounts[t]);
  const labels = activeTypes.map(t => ACNE_LABELS[t] || t);
  const colors = activeTypes.map(t => ACNE_COLORS[t] || "#ccc");

  // Add "Clear Skin" (หน้าใส) to the pie chart if there are any
  if (clearSkinCount > 0) {
    series.push(clearSkinCount);
    labels.push(ACNE_LABELS["no_acne"] || "หน้าใสไร้สิว");
    colors.push(ACNE_COLORS["no_acne"] || "#10b981");
  }

  const isDark = theme === "dark";

  const options: ApexOptions = {
    chart: {
      type: "pie",
      background: "transparent",
      fontFamily: "inherit",
    },
    labels: labels,
    colors: colors,
    stroke: {
      show: true,
      colors: isDark ? ["#1e293b"] : ["#ffffff"],
      width: 2,
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number, opts) => {
        // Show percentage
        return `${val.toFixed(1)}%`;
      },
    },
    legend: {
      position: "bottom",
      labels: {
        colors: isDark ? "#e5e7eb" : "#374151",
      },
    },
    tooltip: {
      theme: isDark ? "dark" : "light",
      y: {
        formatter: (val, opts) => {
          if (!opts?.w?.globals?.labels) {
            return `${val}`;
          }
          const label = opts.w.globals.labels[opts.seriesIndex];
          if (label === ACNE_LABELS["no_acne"] || label === "หน้าใสไร้สิว") {
            return `${val} ครั้ง`;
          }
          return `${val} จุด`;
        },
      },
    },
    theme: {
      mode: isDark ? "dark" : "light",
    },
  };

  if (data.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center text-muted-foreground">
        ยังไม่มีประวัติการวิเคราะห์
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center text-muted-foreground">
        ไม่พบข้อมูลสิวในช่วงเวลานี้
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center h-[350px] relative z-0 mt-4">
      <Chart options={options} series={series} type="pie" height={350} width="100%" />
    </div>
  );
}
