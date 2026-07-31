"use client";

import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface AdminGrowthChartProps {
  data: {
    date: string;
    newUsers: number;
    existingUsers: number;
  }[];
}

export function AdminGrowthChart({ data }: AdminGrowthChartProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full relative z-0 flex items-center justify-center min-h-[350px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse text-sm">กำลังโหลดข้อมูลการเติบโต...</p>
        </div>
      </div>
    );
  }

  const seriesData = data.map((item) => {
    const timestamp = item.rawDate ? new Date(item.rawDate).getTime() : new Date().getTime();
    return [timestamp, item.existingUsers + item.newUsers];
  });
  
  const series = [
    {
      name: "ยอดผู้ใช้สะสม (Total Users)",
      type: "area",
      data: seriesData,
    }
  ];

  const isDark = theme === "dark";

  const options: ApexOptions = {
    chart: {
      stacked: false,
      height: 350,
      zoom: {
        type: "x",
        enabled: true,
      },
      toolbar: {
        autoSelected: "zoom",
        show: true,
      },
      background: "transparent",
      fontFamily: "inherit",
    },
    colors: ["#6366f1"], // Indigo for Growth
    stroke: {
      width: 3, 
      curve: seriesData.length > 2 ? "smooth" : "straight",
    },
    fill: {
      opacity: 0.25,
      type: "gradient",
      gradient: {
        inverseColors: false,
        shade: "light",
        type: "vertical",
        opacityFrom: 0.5,
        opacityTo: 0.05,
        stops: [0, 100, 100, 100]
      }
    },
    markers: {
      size: 4,
      colors: ["#fff"],
      strokeColors: ["#6366f1"],
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    dataLabels: {
      enabled: true,
      offsetY: -10,
      style: {
        fontSize: "12px",
        fontFamily: "inherit",
        fontWeight: "bold",
      },
      background: {
        enabled: true,
        foreColor: "#ffffff",
        padding: 6,
        borderRadius: 4,
        borderWidth: 0,
        opacity: 0.9,
      },
      formatter: (value: number) => value === 0 ? "" : `${value} คน`,
    },
    xaxis: {
      type: "datetime",
      labels: {
        style: {
          colors: isDark ? "#9ca3af" : "#6b7280",
        },
        formatter: (val, timestamp) => {
          if (!timestamp) return val.toString();
          return new Intl.DateTimeFormat("th-TH", {
            day: "numeric",
            month: "short",
          }).format(new Date(timestamp));
        },
      },
      tooltip: {
        enabled: false,
      },
    },
    yaxis: {
      title: {
        text: "จำนวนผู้ใช้งานทั้งหมด (คน)",
        style: {
          color: isDark ? "#9ca3af" : "#6b7280",
          fontFamily: "inherit",
        },
      },
      labels: {
        style: {
          colors: isDark ? "#9ca3af" : "#6b7280",
        },
        formatter: (value) => value.toFixed(0),
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: isDark ? "dark" : "light",
      x: {
        formatter: (val) => {
          const date = new Date(val);
          return new Intl.DateTimeFormat("th-TH", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(date);
        },
      },
      y: {
        formatter: function (y) {
          if (typeof y !== "undefined") {
            return y.toFixed(0) + " คน";
          }
          return y;
        }
      }
    },
    legend: {
      show: false
    },
    theme: {
      mode: isDark ? "dark" : "light",
    },
  };

  if (data.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center border rounded-2xl bg-card text-muted-foreground">
        ไม่มีข้อมูลการเติบโตในช่วงเวลานี้
      </div>
    );
  }

  return (
    <div className="w-full relative z-0 mt-2">
      <Chart options={options} series={series} type="area" height={350} width="100%" />
    </div>
  );
}
