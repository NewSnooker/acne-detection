"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import { usePrimaryColor } from "@/hooks/use-primary-color";
import dynamic from "next/dynamic";
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
  const { resolvedTheme } = useTheme();
  const primary = usePrimaryColor(); // เส้นกราฟใช้สีหลักของธีม
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className="relative z-0 mt-4 flex min-h-[400px] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="border-primary/20 border-t-primary h-10 w-10 animate-spin rounded-full border-4" />
          <p className="text-muted-foreground animate-pulse text-sm">
            กำลังโหลดข้อมูลกราฟ...
          </p>
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

  // Hack for ApexCharts: If there's only 1 data point, the area chart and gradient won't render.
  // We duplicate the point 24 hours in the past to form a trend line from yesterday.
  if (seriesData.length === 1) {
    const singlePoint = seriesData[0];
    seriesData.unshift([(singlePoint[0] as number) - 86400000, singlePoint[1]]);
  }

  const isDark = resolvedTheme === "dark";

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
    colors: [primary],
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
      formatter: (value: number) => (value === 0 ? "" : `${value} จุด`),
    },
    markers: {
      size: 5,
      colors: ["#fff"],
      strokeColors: primary,
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
      <EmptyState title="ยังไม่มีประวัติการวิเคราะห์" className="h-[350px]" />
    );
  }

  return (
    <div className="relative z-0 mt-4 w-full">
      <Chart
        options={options}
        series={series}
        type="area"
        height={400}
        width="100%"
      />
    </div>
  );
}
