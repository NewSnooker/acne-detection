"use client";

import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface PersonalStatsChartProps {
  data: {
    createdAt: Date;
    total: number;
    severity: string;
  }[];
}

export function PersonalStatsChart({ data }: PersonalStatsChartProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full relative z-0 mt-4 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse text-sm">กำลังโหลดข้อมูลกราฟ...</p>
        </div>
      </div>
    );
  }

  // Format data for ApexCharts
  // We want a timeseries array of [timestamp, value]
  const seriesData = data.map((item) => {
    return [new Date(item.createdAt).getTime(), item.total];
  });

  // Sort chronologically just in case
  seriesData.sort((a, b) => (a[0] as number) - (b[0] as number));

  const isDark = theme === "dark";

  const options: ApexOptions = {
    chart: {
      type: "area",
      stacked: false,
      height: 400,
      zoom: {
        type: "x",
        enabled: true,
        autoScaleYaxis: true,
      },
      toolbar: {
        autoSelected: "zoom",
      },
      background: "transparent",
      fontFamily: "inherit",
    },
    colors: ["#7c3aed"], // Primary color
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "12px",
        fontFamily: "inherit",
        fontWeight: "bold",
        colors: ["#ffffff"],
      },
      background: {
        enabled: true,
        foreColor: "#fff",
        padding: 4,
        borderRadius: 4,
        borderWidth: 0,
        borderColor: "#fff",
        opacity: 1,
        dropShadow: {
          enabled: false,
        },
      },
      formatter: (value: number) => value.toString(),
      offsetY: -5,
    },
    markers: {
      size: 5,
      colors: ["#fff"],
      strokeColors: "#7c3aed",
      strokeWidth: 2,
      hover: {
        size: 7,
      },
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    yaxis: {
      title: {
        text: "จำนวนสิวทั้งหมด",
        style: {
          color: isDark ? "#9ca3af" : "#6b7280",
        },
      },
      labels: {
        style: {
          colors: isDark ? "#9ca3af" : "#6b7280",
        },
        formatter: (value) => value.toFixed(0),
      },
    },
    xaxis: {
      type: "datetime",
      labels: {
        style: {
          colors: isDark ? "#9ca3af" : "#6b7280",
        },
        formatter: (val, timestamp) => {
          if (!timestamp) return val;
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
    tooltip: {
      theme: isDark ? "dark" : "light",
      x: {
        formatter: (val) => {
          const date = new Date(val);
          return new Intl.DateTimeFormat("th-TH", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(date);
        },
      },
      y: {
        formatter: (value) => `${value} จุด`,
      },
    },
    theme: {
      mode: isDark ? "dark" : "light",
    },
  };

  const series = [
    {
      name: "จำนวนสิว",
      data: seriesData,
    },
  ];

  if (data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center border rounded-2xl bg-card text-muted-foreground">
        ยังไม่มีประวัติการวิเคราะห์
      </div>
    );
  }

  return (
    <div className="w-full relative z-0 mt-4">
      <Chart options={options} series={series} type="area" height={400} width="100%" />
    </div>
  );
}
