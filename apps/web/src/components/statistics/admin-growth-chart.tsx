"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import { usePrimaryColor } from "@/hooks/use-primary-color";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface AdminGrowthChartProps {
  data: {
    date: string;
    rawDate?: Date | string;
    newUsers: number;
    existingUsers: number;
  }[];
}

export function AdminGrowthChart({ data }: AdminGrowthChartProps) {
  const { resolvedTheme } = useTheme();
  const primary = usePrimaryColor(); // เส้นกราฟใช้สีหลักของธีม
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className="relative z-0 flex min-h-[350px] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="border-primary/20 border-t-primary h-10 w-10 animate-spin rounded-full border-4" />
          <p className="text-muted-foreground animate-pulse text-sm">
            กำลังโหลดข้อมูลการเติบโต...
          </p>
        </div>
      </div>
    );
  }

  const seriesData = data.map((item) => {
    const timestamp = item.rawDate
      ? new Date(item.rawDate).getTime()
      : new Date().getTime();
    return [timestamp, item.existingUsers + item.newUsers];
  });

  const series = [
    {
      name: "ยอดผู้ใช้สะสม (Total Users)",
      type: "area",
      data: seriesData,
    },
  ];

  const isDark = resolvedTheme === "dark";

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
    colors: [primary],
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
        stops: [0, 100, 100, 100],
      },
    },
    markers: {
      size: 4,
      colors: ["#fff"],
      strokeColors: [primary],
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
      formatter: (value: number) => (value === 0 ? "" : `${value} คน`),
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
        },
      },
    },
    legend: {
      show: false,
    },
    theme: {
      mode: isDark ? "dark" : "light",
    },
  };

  if (data.length === 0) {
    return (
      <EmptyState
        title="ไม่มีข้อมูลการเติบโตในช่วงเวลานี้"
        className="h-[350px]"
      />
    );
  }

  return (
    <div className="relative z-0 mt-2 w-full">
      <Chart
        options={options}
        series={series}
        type="area"
        height={350}
        width="100%"
      />
    </div>
  );
}
