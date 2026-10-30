"use client";

import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { SEVERITY_LABELS } from "@/types/analyze";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface SeverityDonutChartProps {
  data?: {
    severity: string;
  }[];
  preAggregated?: { MILD: number; MODERATE: number; SEVERE: number };
}

export function SeverityDonutChart({
  data = [],
  preAggregated,
}: SeverityDonutChartProps) {
  const { theme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className="relative z-0 mt-4 flex min-h-[350px] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="border-primary/20 border-t-primary h-10 w-10 animate-spin rounded-full border-4" />
          <p className="text-muted-foreground animate-pulse text-sm">
            กำลังโหลดข้อมูลกราฟ...
          </p>
        </div>
      </div>
    );
  }

  // Count occurrences of each severity
  let counts: Record<string, number> = {
    MILD: 0,
    MODERATE: 0,
    SEVERE: 0,
  };

  if (preAggregated) {
    counts = { ...preAggregated };
  } else {
    data.forEach((item) => {
      if (counts[item.severity] !== undefined) {
        counts[item.severity]++;
      }
    });
  }

  const series = [counts.MILD || 0, counts.MODERATE || 0, counts.SEVERE || 0];

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
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800,
        dynamicAnimation: {
          enabled: true,
          speed: 350,
        },
      },
      dropShadow: {
        enabled: true,
        color: "#000",
        top: 2,
        left: 3,
        blur: 4,
        opacity: isDark ? 0.3 : 0.1,
      },
    },
    labels: labels,
    colors: colors,
    stroke: {
      show: true,
      colors: isDark ? ["#020817"] : ["#ffffff"],
      width: 3,
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: isDark ? "dark" : "light",
        type: "vertical",
        shadeIntensity: 0.5,
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 0.8,
        stops: [0, 100],
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(0)}%`,
      style: {
        fontSize: "13px",
        fontFamily: "inherit",
        fontWeight: "bold",
        colors: ["#ffffff"],
      },
      dropShadow: {
        enabled: true,
        top: 1,
        left: 1,
        blur: 1,
        opacity: 0.5,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "14px",
              fontWeight: 500,
              color: isDark ? "#9ca3af" : "#6b7280",
            },
            value: {
              show: true,
              fontSize: "24px",
              fontWeight: "bold",
              color: isDark ? "#f3f4f6" : "#111827",
              formatter: (val) => `${val} ครั้ง`,
            },
            total: {
              show: true,
              showAlways: false,
              label: "ทั้งหมด",
              fontSize: "14px",
              color: isDark ? "#9ca3af" : "#6b7280",
              formatter: function (w) {
                return (
                  w.globals.seriesTotals.reduce(
                    (a: number, b: number) => a + b,
                    0,
                  ) + " ครั้ง"
                );
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

  if (
    (!preAggregated && data.length === 0) ||
    (preAggregated && Object.values(preAggregated).every((v) => v === 0))
  ) {
    return (
      <div className="text-muted-foreground flex h-[400px] w-full items-center justify-center">
        ยังไม่มีประวัติการวิเคราะห์
      </div>
    );
  }

  // If all zeros, show empty
  if (series.every((val) => val === 0)) {
    return (
      <div className="text-muted-foreground flex h-[400px] w-full items-center justify-center">
        ไม่พบข้อมูลระดับความรุนแรง
      </div>
    );
  }

  return (
    <div className="relative z-0 mt-4 flex h-[350px] w-full items-center justify-center">
      <Chart
        options={options}
        series={series}
        type="donut"
        height={350}
        width="100%"
      />
    </div>
  );
}
