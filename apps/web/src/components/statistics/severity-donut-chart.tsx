"use client";

import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import { SEVERITY_LABELS } from "@/types/analyze";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface SeverityDonutChartProps {
  data: {
    severity: string;
  }[];
}

export function SeverityDonutChart({ data }: SeverityDonutChartProps) {
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

  // Count occurrences of each severity
  const counts: Record<string, number> = {
    MILD: 0,
    MODERATE: 0,
    SEVERE: 0,
  };

  data.forEach((item) => {
    if (counts[item.severity] !== undefined) {
      counts[item.severity]++;
    }
  });

  const series = [counts.MILD, counts.MODERATE, counts.SEVERE];
  
  // Only use colors if they correspond to tailwind classes or define hex
  const colors = ["#10b981", "#d97706", "#ef4444"]; // emerald-500, amber-600, red-500

  const labels = [
    SEVERITY_LABELS.MILD?.label || "เล็กน้อย",
    SEVERITY_LABELS.MODERATE?.label || "ปานกลาง",
    SEVERITY_LABELS.SEVERE?.label || "รุนแรง",
  ];

  const isDark = theme === "dark";

  const options: ApexOptions = {
    chart: {
      type: "donut",
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
      formatter: (val: number) => `${val.toFixed(1)}%`,
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            name: {
              show: true,
            },
            value: {
              show: true,
              formatter: (val) => `${val} ครั้ง`,
            },
            total: {
              show: true,
              showAlways: false,
              label: "ทั้งหมด",
              formatter: function (w) {
                return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0) + " ครั้ง";
              },
            },
          },
        },
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
        formatter: (val) => `${val} ครั้ง`,
      },
    },
    theme: {
      mode: isDark ? "dark" : "light",
    },
  };

  if (data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center border rounded-2xl bg-card text-muted-foreground">
        ยังไม่มีประวัติการวิเคราะห์
      </div>
    );
  }

  // If all zeros, show empty
  if (series.every((val) => val === 0)) {
    return (
      <div className="h-[400px] flex items-center justify-center border rounded-2xl bg-card text-muted-foreground">
        ไม่พบข้อมูลระดับความรุนแรง
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center h-[350px] relative z-0 mt-4">
      <Chart options={options} series={series} type="donut" height={350} width="100%" />
    </div>
  );
}
