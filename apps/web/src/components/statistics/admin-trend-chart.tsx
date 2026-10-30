"use client";

import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface AdminTrendChartProps {
  data: {
    date: string;
    rawDate?: Date | string;
    count: number;
  }[];
}

export function AdminTrendChart({ data }: AdminTrendChartProps) {
  const { theme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className="w-full relative z-0 mt-4 flex items-center justify-center min-h-[350px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse text-sm">กำลังโหลดข้อมูลกราฟ...</p>
        </div>
      </div>
    );
  }

  // Admin data comes as `{ date: string, count: number }`
  // but date string is like "27 ก.ค." which ApexCharts can't parse directly into a datetime.
  // Wait, in PersonalStatsChart it came as Date object.
  // We can either map "27 ก.ค." back to a timestamp, OR we can just use "category" x-axis but enable markers and labels.
  // The user wants it to look the same. Let's just use the category axis since we already formatted dates in getAdminStatistics!
  
  const seriesData = data.map((item) => {
    // rawDate is 'yyyy-MM-dd' or undefined
    const timestamp = item.rawDate ? new Date(item.rawDate).getTime() : new Date().getTime();
    return [timestamp, item.count];
  });

  const isDark = theme === "dark";

  const options: ApexOptions = {
    chart: {
      type: "area",
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
    colors: ["#7c3aed"], // Primary color
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
      formatter: (value: number) => value === 0 ? "" : `${value} ครั้ง`,
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
      curve: seriesData.length > 2 ? "smooth" : "straight",
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
        text: "จำนวนสแกน",
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
    tooltip: {
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
        formatter: (value) => `${value} ครั้ง`,
      },
    },
    theme: {
      mode: isDark ? "dark" : "light",
    },
  };

  const series = [
    {
      name: "การสแกนทั้งหมด",
      data: seriesData,
    },
  ];

  if (data.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center border rounded-2xl bg-card text-muted-foreground">
        ไม่มีข้อมูลการใช้งานในช่วงเวลานี้
      </div>
    );
  }

  return (
    <div className="w-full relative z-0 mt-4">
      <Chart options={options} series={series} type="area" height={350} width="100%" />
    </div>
  );
}
