"use client";

import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DetectionResultsChartProps {
  data: {
    ACNE: number;
    CLEAR: number;
  };
}

export function DetectionResultsChart({ data }: DetectionResultsChartProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full relative z-0 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse text-sm">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  const isDark = theme === "dark";

  const series = [data.ACNE, data.CLEAR];
  const labels = ["พบสิว", "หน้าใส (ไม่พบสิว)"];

  const options: ApexOptions = {
    chart: {
      type: "donut",
      background: "transparent",
      fontFamily: "inherit",
    },
    labels: labels,
    colors: ["#f43f5e", "#10b981"], // Rose for Acne, Emerald for Clear
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(1)}%`,
      style: {
        fontSize: "12px",
        fontWeight: "bold",
        fontFamily: "inherit",
      },
      dropShadow: {
        enabled: true,
        opacity: 0.3,
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "14px",
              fontFamily: "inherit",
              color: isDark ? "#9ca3af" : "#6b7280",
            },
            value: {
              show: true,
              fontSize: "24px",
              fontWeight: "bold",
              fontFamily: "inherit",
              color: isDark ? "#f3f4f6" : "#111827",
              formatter: (val) => `${val} ครั้ง`,
            },
            total: {
              show: true,
              showAlways: true,
              label: "รวมทั้งหมด",
              fontSize: "14px",
              fontFamily: "inherit",
              color: isDark ? "#9ca3af" : "#6b7280",
              formatter: function (w) {
                return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0) + " ครั้ง";
              },
            },
          },
        },
      },
    },
    stroke: {
      show: true,
      colors: isDark ? ["#1f2937"] : ["#ffffff"],
      width: 2,
    },
    tooltip: {
      theme: isDark ? "dark" : "light",
      y: {
        formatter: (value) => `${value} ครั้ง`,
      },
    },
    legend: {
      position: "bottom",
      horizontalAlign: "center",
      labels: {
        colors: isDark ? "#e5e7eb" : "#374151",
      },
      markers: {
        size: 6,
      },
      itemMargin: {
        horizontal: 10,
        vertical: 5,
      },
    },
    theme: {
      mode: isDark ? "dark" : "light",
    },
  };

  const total = data.ACNE + data.CLEAR;
  
  if (total === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center border rounded-2xl bg-card text-muted-foreground">
        ไม่มีข้อมูล
      </div>
    );
  }

  return (
    <div className="w-full relative z-0 flex items-center justify-center">
      <Chart options={options} series={series} type="donut" height={320} width="100%" />
    </div>
  );
}
