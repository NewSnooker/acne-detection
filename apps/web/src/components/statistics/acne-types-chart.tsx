"use client";

import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { ACNE_COLORS, ACNE_LABELS } from "@/types/analyze";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface AcneTypesChartProps {
  data?: {
    counts: any; // Record<string, number>
    total: number;
  }[];
  preAggregated?: { type: string; count: number }[];
  clearSkinCount?: number;
}

export function AcneTypesChart({
  data = [],
  preAggregated,
  clearSkinCount: passedClearSkinCount = 0,
}: AcneTypesChartProps) {
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

  const types = [
    "papule",
    "pustule",
    "nodule",
    "cyst",
    "blackhead",
    "whitehead",
  ];

  // Aggregate counts over the selected period
  const aggregatedCounts: Record<string, number> = {};
  types.forEach((t) => (aggregatedCounts[t] = 0));
  let clearSkinCount = passedClearSkinCount;

  if (preAggregated) {
    preAggregated.forEach((item) => {
      if (item.type === "no_acne") {
        clearSkinCount = item.count;
      } else if (types.includes(item.type)) {
        aggregatedCounts[item.type] = item.count;
      }
    });
  } else {
    data.forEach((item) => {
      if (item.total === 0) {
        clearSkinCount++;
      } else {
        types.forEach((type) => {
          if (item.counts?.[type]) {
            aggregatedCounts[type] += item.counts[type];
          }
        });
      }
    });
  }

  // Filter out types with 0 counts to keep the pie chart clean
  const activeTypes = types.filter((t) => aggregatedCounts[t] > 0);

  const series = activeTypes.map((t) => aggregatedCounts[t]);
  const labels = activeTypes.map((t) => ACNE_LABELS[t] || t);
  const colors = activeTypes.map((t) => ACNE_COLORS[t] || "#ccc");

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

  if (
    (!preAggregated && data.length === 0) ||
    (preAggregated && preAggregated.length === 0)
  ) {
    return (
      <div className="text-muted-foreground flex h-[350px] items-center justify-center">
        ยังไม่มีประวัติการวิเคราะห์
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[350px] items-center justify-center">
        ไม่พบข้อมูลสิวในช่วงเวลานี้
      </div>
    );
  }

  return (
    <div className="relative z-0 mt-4 flex h-[350px] w-full items-center justify-center">
      <Chart
        options={options}
        series={series}
        type="pie"
        height={350}
        width="100%"
      />
    </div>
  );
}
